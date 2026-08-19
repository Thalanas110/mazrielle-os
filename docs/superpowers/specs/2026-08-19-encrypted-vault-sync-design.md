# Encrypted Vault Sync Design

**Date:** 2026-08-19

**Status:** Approved

## Goal

Synchronize the local PGlite vault with the authenticated user's Supabase vault every 30 minutes while the app is open and unlocked, while keeping all vault content encrypted with AES-256-GCM at rest and in transit to the database.

## Constraints

- Supabase Auth is required for cloud synchronization.
- A local vault must be unlocked before records can sync.
- The app locks only on close, restart, or sign-out; the sync timer must not introduce inactivity locking.
- Plaintext record values, decrypted vault keys, and master secrets must never be sent to Supabase or written to logs.
- Supabase `vault_metadata` and `vault_records` RLS policies remain mandatory.
- Existing PGlite data must remain readable without a migration that decrypts and re-encrypts every row.
- No seed or fabricated records are created.

## Architecture

The sync service is a client-side encrypted-envelope reconciler. It reads raw encrypted rows from PGlite, validates their envelope shape, compares rows with the authenticated user's Supabase rows, and transfers only encrypted JSON envelopes. It never calls the vault crypto provider to decrypt a record during synchronization.

The service has three boundaries:

1. **Local encrypted repository:** exposes raw rows, including tombstones, and can write a validated remote row directly to PGlite without decrypting it.
2. **Supabase transport:** reads and upserts `vault_metadata` and `vault_records` through the authenticated Supabase client. RLS is the authorization boundary; client-side owner checks are defense in depth.
3. **Reconciliation policy:** merges records by `id` and `updated_at`. The newer row wins. Equal timestamps with different ciphertext are treated as a conflict and stop the sync rather than silently discarding either version.

## Data Model

The local table names map to Supabase `record_type` values as follows:

| PGlite table | Supabase record type |
| --- | --- |
| `folders` | `folder` |
| `credentials` | `credential` |
| `notes` | `note` |
| `tasks` | `task` |
| `income` | `income` |
| `activity_log` | `activity_log` |
| `app_settings` | `app_settings` |

Each synchronized record contains:

- `id`
- `owner_id`
- `record_type`
- `folder_id`
- `payload`, as an exact AES-256-GCM encrypted payload object
- `created_at`
- `updated_at`
- `deleted_at`, retained as a tombstone when present

The local `vault_meta.envelope` maps to Supabase `vault_metadata.envelope`. It remains an Argon2id-wrapped AES-256-GCM vault-key envelope and is not a record payload.

## Lifecycle

### Authenticated startup

After Supabase Auth resolves, the app checks whether the local owner has a vault. Before rendering setup, it may bootstrap a missing local `vault_meta` row from the authenticated owner's remote `vault_metadata` row. This enables a second device to show the normal local unlock form without downloading plaintext.

If both local and remote metadata exist, their envelopes must match exactly. A mismatch is a hard sync error; the app must not overwrite either envelope because the records may be encrypted under different vault keys.

### First device setup

When a user creates a new local vault, the local envelope is written to PGlite. After the vault becomes unlocked, the first sync uploads the metadata and all local encrypted rows. No data is seeded automatically.

### Unlock

After successful local unlock, the app performs one immediate synchronization. The workspace may render while sync is in progress, but sync failures must be visible through the sync status control.

### Periodic sync

While the app is authenticated and unlocked, a single 30-minute timer invokes reconciliation. The timer must not overlap an already-running synchronization. If the app is offline, the attempt fails closed with a retryable status; the next interval or manual retry can recover it.

The timer is cancelled when the user signs out or the vault becomes locked. No sync work starts without both a valid authenticated session and an unlocked local vault.

## Reconciliation Algorithm

1. Verify the supplied owner ID matches the current Supabase session user ID and current local vault owner.
2. Read local vault metadata and remote vault metadata.
3. Bootstrap a missing local envelope from remote metadata when the local vault does not exist. When the local vault exists, upload a missing remote envelope after unlock.
4. Reject any metadata mismatch before processing records.
5. Read all local encrypted rows, including rows with `deleted_at`, and validate each payload.
6. Fetch all remote rows visible to the authenticated owner, including tombstones, and validate owner, record type, timestamps, and payload shape.
7. For each record ID:
   - If only local exists, queue the local row for remote upsert.
   - If only remote exists, queue the remote row for local insertion.
   - If both exist and local `updated_at` is newer, queue the local row for remote upsert.
   - If both exist and remote `updated_at` is newer, queue the remote row for local insertion/update.
   - If timestamps are equal and the rows differ, throw a non-recoverable conflict for this run and leave both sides unchanged.
8. Apply remote upserts in bounded batches. The server trigger may assign a fresh `updated_at`; the final remote snapshot is fetched after writes so local state can use the authoritative timestamp.
9. Apply remote-winning rows directly to PGlite as encrypted rows. A remote tombstone remains local and is not physically removed.
10. Return counts and the final `lastSyncedAt` without including payload contents.

The reconciler must be deterministic and idempotent. Re-running a successful sync with no changes must produce no data changes.

## Error Handling

- Missing Supabase configuration: mark sync unavailable and continue local-only operation.
- Missing or expired session: do not start sync; show authentication-required status.
- Locked vault: do not start sync and do not read encrypted rows.
- Invalid local or remote envelope: reject that sync run without importing or uploading the invalid row.
- Owner mismatch: reject the run without database writes.
- Vault metadata mismatch: reject the run and require explicit user resolution; never replace either envelope automatically.
- Network or Supabase error: retain local data, expose a retryable error, and retry on the next interval.
- Equal-timestamp ciphertext conflict: retain both sides as-is and expose a conflict status. Do not choose a winner silently.
- Partial batch failure: report failure and reconcile again from a fresh remote snapshot on the next attempt. All operations are upserts and therefore safe to retry.

Errors must not include payloads, passwords, recovery keys, access tokens, or decrypted values.

## UI Status

The workspace exposes a compact sync status with these states:

- `Local only`
- `Syncing`
- `Synced just now` or a relative last-sync time
- `Sync failed, retry`
- `Vault conflict`

Manual retry invokes the same non-overlapping reconciler. Status state is in-memory only and is not persisted into the encrypted vault.

## Testing Strategy

1. Test envelope validators accept exact AES-256-GCM payloads and reject plaintext, missing fields, extra fields, wrong algorithms, and malformed timestamps.
2. Test reconciliation decisions for local-only, remote-only, local-newer, remote-newer, tombstone, equal-identical, and equal-conflicting rows.
3. Test owner and vault-lock guards prevent transport calls.
4. Test metadata bootstrap, upload, and mismatch behavior.
5. Test the 30-minute scheduler does not overlap runs and stops on lock or sign-out.
6. Test the Supabase adapter sends only validated encrypted JSON payloads and never calls decryption.
7. Run the existing crypto, auth configuration, and vault state tests unchanged.
8. Run TypeScript typecheck, ESLint, production build, Tauri `cargo check`, and Supabase database lint.

## Security Review Notes

- Supabase receives ciphertext, nonce, algorithm, and version metadata only.
- AES-GCM authentication protects every transported record payload; malformed or tampered payloads are rejected by both client validation and database constraints.
- RLS policies restrict rows to `auth.uid()` and anonymous/public table privileges remain revoked.
- The client never trusts row ownership merely because the response is typed; it validates the authenticated owner ID before importing a row.
- The service does not log row payloads or secrets.
- The 30-minute interval is a scheduling policy, not a cryptographic control. Local encryption and the separate vault unlock remain mandatory.
