# Encrypted Vault Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize encrypted PGlite vault rows with the authenticated Supabase vault immediately after unlock and every 30 minutes while the app remains unlocked.

**Architecture:** Add a raw encrypted local repository, a validated Supabase transport, and a pure timestamp-based reconciliation policy. A lifecycle hook starts one immediate sync and a non-overlapping 30-minute interval only when a Supabase session and unlocked vault are both present; the UI exposes status and retry without persisting sync state.

**Tech Stack:** React 18, TypeScript 5, PGlite, Supabase JS v2, Supabase RLS, Node test runner, Tauri 2.

## Global Constraints

- Supabase Auth is required for cloud synchronization.
- Synchronization runs immediately after unlock and every `30 * 60 * 1000` milliseconds while authenticated and unlocked.
- No synchronization starts while signed out or while the vault is locked.
- Supabase receives only exact AES-256-GCM encrypted envelopes; plaintext values and decrypted keys never leave the local process.
- Supabase `vault_metadata` and `vault_records` RLS policies remain mandatory.
- Local PGlite data remains available when cloud sync is unavailable.
- Tombstones are synchronized and are not physically removed during reconciliation.
- Equal timestamps with different encrypted row contents are conflicts; neither side is overwritten automatically.
- No seed, fabricated, or plaintext records are created.
- Do not add a runtime dependency; use existing Web Crypto, PGlite, and Supabase JS packages.
- Do not log payloads, passwords, recovery keys, access tokens, or decrypted values.

---

## File Map

| File | Responsibility |
| --- | --- |
| `src/lib/syncTypes.ts` | Shared encrypted row, remote metadata, status, table mapping, and adapter types. |
| `src/lib/syncValidation.ts` | Runtime allowlist validation for encrypted payloads, vault envelopes, rows, and timestamps. |
| `src/lib/syncLocalRepository.ts` | Raw PGlite reads and writes that preserve ciphertext and tombstones without decrypting. |
| `src/lib/syncMerge.ts` | Pure deterministic merge-plan generation. |
| `src/lib/syncTransport.ts` | Authenticated Supabase reads/upserts and response validation. |
| `src/lib/sync.ts` | Metadata bootstrap and full encrypted reconciliation orchestration. |
| `src/lib/syncScheduler.ts` | Tested non-overlapping 30-minute scheduler primitive. |
| `src/lib/useVaultSync.ts` | React lifecycle/status hook around the sync service and scheduler. |
| `src/lib/syncStatus.ts` | Pure status-to-label and retryability helpers for the UI. |
| `src/components/SyncStatus.tsx` | Compact status and retry control. |
| `src/App.tsx` | Remote metadata bootstrap, unlock/session lifecycle wiring, and workspace status mounting. |
| `src/views/Dashboard.tsx` | Replace stale no-cloud-sync copy with current sync semantics. |
| `src/views/SettingsView.tsx` | Document that cloud sync is authenticated, encrypted, and periodic. |
| `README.md` | Update setup and sync behavior. |
| `test/syncValidation.test.ts` | Validator tests. |
| `test/syncLocalRepository.test.ts` | Local table-to-record mapping and raw-row parsing tests. |
| `test/syncMerge.test.ts` | Merge and conflict tests. |
| `test/syncScheduler.test.ts` | Interval, cancellation, and overlap tests. |
| `test/syncStatus.test.ts` | Pure status label and retryability tests. |
| `test/sync.test.ts` | Orchestrator tests with in-memory adapters. |

## Dependency Order

Tasks 1 through 6 are sequential because later tasks consume earlier interfaces. Task 7 is the UI/lifecycle integration after the service contract exists. Task 8 is documentation and stale-copy cleanup. Task 9 is final verification and hosted-schema validation.

## Task 1: Define Sync Types And Validators

**Files:**
- Create: `src/lib/syncTypes.ts`
- Create: `src/lib/syncValidation.ts`
- Test: `test/syncValidation.test.ts`

**Interfaces:**
- Produces `SyncRecordType = 'folder' | 'credential' | 'note' | 'task' | 'income' | 'activity_log' | 'app_settings'`, `LocalSyncTable = 'folders' | 'credentials' | 'notes' | 'tasks' | 'income' | 'activity_log' | 'app_settings'`, `RawLocalSyncRow`, `EncryptedSyncRow`, `RemoteVaultMetadata`, `SyncStatus = 'local' | 'syncing' | 'synced' | 'error' | 'conflict'`, `SyncResult`, `SyncTransport`, and `SyncStore` types for later tasks.
- `SyncResult` contains `pushed: number`, `pulled: number`, `unchanged: number`, and `lastSyncedAt: string`.
- Produces `isEncryptedPayload(value: unknown): value is EncryptedPayload`, `assertEncryptedPayload(value: unknown): EncryptedPayload`, `assertVaultEnvelope(value: unknown): VaultEnvelope`, and `assertRemoteRecord(value: unknown, ownerId: string): EncryptedSyncRow`.

- [ ] **Step 1: Write failing validator tests**

```ts
test('accepts an exact AES-256-GCM payload', () => {
  assert.equal(isEncryptedPayload({
    version: 1,
    algorithm: 'AES-256-GCM',
    nonce: 'nonce',
    ciphertext: 'ciphertext',
  }), true);
});

test('rejects plaintext and payloads with extra fields', () => {
  assert.equal(isEncryptedPayload('password'), false);
  assert.equal(isEncryptedPayload({
    version: 1,
    algorithm: 'AES-256-GCM',
    nonce: 'nonce',
    ciphertext: 'ciphertext',
    plaintext: 'password',
  }), false);
});

test('rejects a remote row owned by a different user', () => {
  assert.throws(() => assertRemoteRecord({
    id: 'record-1', owner_id: 'other-user', record_type: 'credential', folder_id: null,
    payload: { version: 1, algorithm: 'AES-256-GCM', nonce: 'nonce', ciphertext: 'ciphertext' },
    created_at: '2026-08-19T00:00:00.000Z', updated_at: '2026-08-19T00:00:00.000Z', deleted_at: null,
  }, 'user-1'), /owner/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing module**

Run: `node --experimental-strip-types --test test/syncValidation.test.ts`

Expected: FAIL because `syncValidation.ts` and its exported validators do not exist yet.

- [ ] **Step 3: Implement strict allowlist validation**

Use `Object.keys(value).sort()` to require the exact four encrypted payload keys. Require `version === 1`, `algorithm === 'AES-256-GCM'`, and non-empty string `nonce` and `ciphertext`. Require the exact wrapped-key and vault-envelope shapes defined by `VaultEnvelope`; do not silently strip unknown fields. Require supported record types, non-empty IDs, owner equality, and parseable ISO timestamps. Error messages may include only field names and record IDs.

- [ ] **Step 4: Run the focused tests**

Run: `node --experimental-strip-types --test test/syncValidation.test.ts`

Expected: all validator tests pass.

- [ ] **Step 5: Commit the contract**

```powershell
git add src/lib/syncTypes.ts src/lib/syncValidation.ts test/syncValidation.test.ts
git commit -m "feat: add encrypted sync validation contract"
```

## Task 2: Add Raw Encrypted PGlite Access

**Files:**
- Create: `src/lib/syncLocalRepository.ts`
- Modify: `src/lib/syncTypes.ts`
- Test: `test/syncLocalRepository.test.ts`

**Interfaces:**
- Produces `createLocalSyncStore(): SyncStore`.
- `SyncStore.listRecords(ownerId: string): Promise<EncryptedSyncRow[]>` returns every supported table row, including `deleted_at` tombstones, without calling decrypt.
- `SyncStore.upsertRecord(row: EncryptedSyncRow): Promise<void>` writes the validated ciphertext directly to the mapped local table.
- `SyncStore.getVaultMetadata(ownerId: string): Promise<RemoteVaultMetadata | null>` and `saveVaultMetadata(metadata: RemoteVaultMetadata): Promise<void>` read/write `vault_meta` without decrypting the envelope.
- Produces `parseLocalEncryptedRow(table: LocalSyncTable, row: RawLocalSyncRow): EncryptedSyncRow` for deterministic testing of raw-row mapping.

- [ ] **Step 1: Write failing raw-row mapping tests**

```ts
test('maps credentials to the singular remote type without decrypting payloads', () => {
  const row = parseLocalEncryptedRow('credentials', {
    id: 'record-1', owner_id: 'user-1', folder_id: null,
    payload: JSON.stringify(encryptedPayload()),
    created_at: '2026-08-19T00:00:00.000Z', updated_at: '2026-08-19T00:00:00.000Z',
    deleted_at: '2026-08-19T00:01:00.000Z',
  });
  assert.equal(row.record_type, 'credential');
  assert.equal(row.deleted_at, '2026-08-19T00:01:00.000Z');
  assert.deepEqual(row.payload, encryptedPayload());
});
```

- [ ] **Step 2: Run the focused contract tests and verify the missing implementation failure**

Run: `node --experimental-strip-types --test test/syncLocalRepository.test.ts`

Expected: FAIL because `parseLocalEncryptedRow` and the raw repository module are not implemented.

- [ ] **Step 3: Implement table mappings and raw reads**

Use a fixed map from `SyncRecordType` to local table names. Query each table with `SELECT id, owner_id, folder_id, payload, created_at, updated_at, deleted_at`, including deleted rows. Parse the stored payload JSON and call `assertEncryptedPayload`; never call `getRecord`, `listRecords`, or the vault crypto provider. Map local table names to the singular remote record type.

- [ ] **Step 4: Implement raw metadata and upsert writes**

Use parameterized values for every dynamic value. The table name may only come from the fixed mapping. For an upsert, write `owner_id`, `folder_id`, JSON-stringified encrypted payload, timestamps, and `deleted_at` with `ON CONFLICT (id) DO UPDATE`. Validate owner equality and payload shape before issuing SQL. Preserve remote timestamps instead of replacing them with local `now()`.

- [ ] **Step 5: Run typecheck and focused tests**

Run: `npm run typecheck` and `node --experimental-strip-types --test test/syncLocalRepository.test.ts`

Expected: the new interfaces typecheck and the adapter contract fixtures pass.

- [ ] **Step 6: Commit the raw repository**

```powershell
git add src/lib/syncLocalRepository.ts src/lib/syncTypes.ts test/syncLocalRepository.test.ts
git commit -m "feat: expose raw encrypted local sync rows"
```

## Task 3: Implement Pure Merge Decisions

**Files:**
- Create: `src/lib/syncMerge.ts`
- Test: `test/syncMerge.test.ts`

**Interfaces:**
- Produces `buildMergePlan(localRows: EncryptedSyncRow[], remoteRows: EncryptedSyncRow[]): MergePlan`.
- Produces `SyncConflictError` whose public data contains only the conflicting record ID.
- `MergePlan` contains `pushToRemote`, `applyToLocal`, and `unchanged` counts/rows; it never contains decrypted values.

- [ ] **Step 1: Write failing merge tests**

```ts
test('pushes a local-only row and applies a remote-only row', () => {
  const plan = buildMergePlan([localRow('local-only')], [remoteRow('remote-only')]);
  assert.deepEqual(plan.pushToRemote.map(row => row.id), ['local-only']);
  assert.deepEqual(plan.applyToLocal.map(row => row.id), ['remote-only']);
});

test('remote tombstones win when they are newer', () => {
  const plan = buildMergePlan([localRow('record-1', '2026-08-19T00:00:00.000Z')], [remoteRow('record-1', '2026-08-19T00:01:00.000Z', '2026-08-19T00:01:00.000Z')]);
  assert.deepEqual(plan.applyToLocal.map(row => row.deleted_at), ['2026-08-19T00:01:00.000Z']);
});

test('rejects equal timestamps with different ciphertext', () => {
  assert.throws(() => buildMergePlan([localRow('record-1')], [remoteRow('record-1', undefined, undefined, 'different')]), SyncConflictError);
});
```

- [ ] **Step 2: Run the focused tests and verify the expected failures**

Run: `node --experimental-strip-types --test test/syncMerge.test.ts`

Expected: FAIL because `buildMergePlan` is not implemented.

- [ ] **Step 3: Implement stable row equality and timestamp ordering**

Compare all row metadata and encrypted payload fields. Use a stable JSON representation for payload equality so property insertion order cannot create false conflicts. Compare ISO timestamps lexicographically only after `assertRemoteRecord` has validated them. For equal rows, do nothing; for equal timestamps with differences, throw `SyncConflictError` before returning a partial plan.

- [ ] **Step 4: Run all merge tests**

Run: `node --experimental-strip-types --test test/syncMerge.test.ts`

Expected: local-only, remote-only, local-newer, remote-newer, tombstone, identical, and conflict cases pass.

- [ ] **Step 5: Commit the merge policy**

```powershell
git add src/lib/syncMerge.ts test/syncMerge.test.ts
git commit -m "feat: add deterministic encrypted sync merge policy"
```

## Task 4: Add The Supabase Transport

**Files:**
- Create: `src/lib/syncTransport.ts`
- Modify: `src/lib/supabase.types.ts` only if generated types need a corrected nullable/JSON shape.
- Test: `test/sync.test.ts` transport fixture coverage.

**Interfaces:**
- Produces `createSupabaseSyncTransport(): SyncTransport`.
- `SyncTransport.getAuthenticatedOwner(): Promise<string | null>` reads the current Auth session.
- `SyncTransport.getVaultMetadata(ownerId: string): Promise<RemoteVaultMetadata | null>` uses authenticated RLS-scoped reads.
- `SyncTransport.upsertVaultMetadata(metadata: RemoteVaultMetadata): Promise<void>` and `upsertRecords(rows: EncryptedSyncRow[]): Promise<void>` use authenticated upserts.
- `SyncTransport.listRecords(ownerId: string): Promise<EncryptedSyncRow[]>` validates every response before returning it.

- [ ] **Step 1: Write failing transport tests**

Use a fake Supabase client whose `from('vault_records').upsert(...)` captures its input. Assert that a valid row is sent with an object payload containing only `version`, `algorithm`, `nonce`, and `ciphertext`, and that an invalid payload is rejected before the fake client receives a write. Assert that a different `owner_id` response is rejected.

- [ ] **Step 2: Run the focused tests and verify the missing transport failure**

Run: `node --experimental-strip-types --test test/sync.test.ts`

Expected: FAIL because `createSupabaseSyncTransport` is not implemented.

- [ ] **Step 3: Implement authenticated reads and writes**

Use `getSupabase()` and the generated `Database` types. Query only the needed columns from `vault_metadata` and `vault_records`, filter by `owner_id`, and treat a no-row metadata response as `null`. Validate owner, record type, timestamps, and exact encrypted payload shape after every read and before every write. Upsert records in batches of 100 with `onConflict: 'id'`. Propagate Supabase errors without including response payloads in new error text.

- [ ] **Step 4: Run transport tests and typecheck**

Run: `node --experimental-strip-types --test test/sync.test.ts` and `npm run typecheck`

Expected: transport tests pass and the generated Supabase client types accept all queries/upserts.

- [ ] **Step 5: Commit the transport**

```powershell
git add src/lib/syncTransport.ts src/lib/supabase.types.ts test/sync.test.ts
git commit -m "feat: add authenticated encrypted Supabase transport"
```

## Task 5: Build Metadata Bootstrap And Reconciliation

**Files:**
- Create: `src/lib/sync.ts`
- Modify: `src/lib/syncTypes.ts`
- Test: `test/sync.test.ts`

**Interfaces:**
- Produces `bootstrapVaultMetadata(ownerId: string, dependencies?: SyncDependencies): Promise<void>`.
- Produces `synchronizeVault(ownerId: string, dependencies?: SyncDependencies): Promise<SyncResult>`.
- Produces `SyncDependencies` with `store`, `transport`, and `isUnlocked` so the orchestrator can be tested with in-memory adapters.
- Exports `SYNC_INTERVAL_MS = 30 * 60 * 1000`.

- [ ] **Step 1: Write failing orchestration tests**

```ts
test('downloads remote metadata when no local vault exists', async () => {
  const { store, transport } = fakeSyncDependencies({ localMetadata: null, remoteMetadata: metadata() });
  await bootstrapVaultMetadata('user-1', { store, transport, isUnlocked: () => false });
  assert.deepEqual(await store.getVaultMetadata('user-1'), metadata());
});

test('uploads local-only encrypted records without decrypting them', async () => {
  const calls: string[] = [];
  const dependencies = fakeSyncDependencies({ localRows: [localRow('record-1')], onRead: operation => calls.push(operation) });
  const result = await synchronizeVault('user-1', dependencies);
  assert.equal(result.pushed, 1);
  assert.deepEqual(calls, ['list-local', 'list-remote', 'upsert-remote']);
});

test('rejects local and remote vault envelope mismatch', async () => {
  const dependencies = fakeSyncDependencies({ localMetadata: metadata(), remoteMetadata: metadata('different') });
  await assert.rejects(() => synchronizeVault('user-1', dependencies), /vault metadata conflict/);
});

test('does not call transport while the vault is locked', async () => {
  const dependencies = fakeSyncDependencies({ isUnlocked: () => false });
  await assert.rejects(() => synchronizeVault('user-1', dependencies), /locked/);
  assert.equal(dependencies.transportCalls, 0);
});
```

- [ ] **Step 2: Run the focused tests and verify the missing orchestrator failure**

Run: `node --experimental-strip-types --test test/sync.test.ts`

Expected: FAIL because `bootstrapVaultMetadata` and `synchronizeVault` are not implemented.

- [ ] **Step 3: Implement owner, session, and unlock guards**

Before any record read, require `isUnlocked() === true`, require the current authenticated owner to equal `ownerId`, and require the local store owner to equal `ownerId`. Missing Supabase configuration should return a local-only result through the hook, not perform transport calls. Locked, signed-out, owner-mismatch, and metadata-conflict errors must be typed and must not expose payloads.

- [ ] **Step 4: Implement metadata bootstrap and mismatch protection**

Fetch remote metadata before setup only when the local metadata is missing. Save a remote envelope locally without decrypting it. When both envelopes exist, compare their stable JSON forms. During unlocked synchronization, upload local metadata if remote metadata is missing. Never overwrite a non-matching envelope.

- [ ] **Step 5: Implement full row reconciliation**

Read local and remote encrypted snapshots, validate both, create a complete merge plan, upsert local-newer/local-only rows in batches, refetch the authoritative remote snapshot, then apply remote-newer/remote-only rows directly to PGlite. Keep tombstones. Return only counts, conflict state, and `lastSyncedAt`.

- [ ] **Step 6: Run all orchestrator tests**

Run: `node --experimental-strip-types --test test/sync.test.ts`

Expected: metadata bootstrap, first upload, remote pull, newer-wins, tombstone, locked guard, owner guard, and mismatch tests pass.

- [ ] **Step 7: Commit the orchestrator**

```powershell
git add src/lib/sync.ts src/lib/syncTypes.ts test/sync.test.ts
git commit -m "feat: reconcile encrypted vault records"
```

## Task 6: Add The Non-Overlapping 30-Minute Scheduler

**Files:**
- Create: `src/lib/syncScheduler.ts`
- Create: `src/lib/useVaultSync.ts`
- Test: `test/syncScheduler.test.ts`

**Interfaces:**
- Produces `startSyncScheduler(syncNow: () => Promise<void>, timers?: SchedulerTimers, intervalMs?: number): () => void`.
- Produces `useVaultSync(ownerId: string | null, enabled: boolean): VaultSyncController`.
- `VaultSyncController` exposes `status`, `lastSyncedAt`, `lastResult`, `error`, and `retry(): Promise<void>`.

- [ ] **Step 1: Write failing scheduler tests**

```ts
test('uses the 30-minute interval and prevents overlapping runs', async () => {
  let resolveFirst: (() => void) | undefined;
  let calls = 0;
  const scheduled: (() => void)[] = [];
  const stop = startSyncScheduler(
    async () => { calls += 1; if (calls === 1) await new Promise<void>(resolve => { resolveFirst = resolve; }); },
    { setInterval: (handler, delay) => { assert.equal(delay, SYNC_INTERVAL_MS); scheduled.push(handler); return 1; }, clearInterval: () => {} },
  );
  scheduled[0](); scheduled[0]();
  await Promise.resolve();
  assert.equal(calls, 1);
  resolveFirst?.();
  stop();
});
```

- [ ] **Step 2: Run the scheduler test and verify the expected missing export failure**

Run: `node --experimental-strip-types --test test/syncScheduler.test.ts`

Expected: FAIL because `startSyncScheduler` is not implemented.

- [ ] **Step 3: Implement the scheduler primitive**

Use `SYNC_INTERVAL_MS` as the default. Track an in-flight promise; interval callbacks return immediately while it is non-null. `stop()` clears the interval and prevents future callbacks from starting work. The scheduler must not use an inactivity timer or call `lockVault`.

- [ ] **Step 4: Implement the React hook**

When `enabled` and `ownerId` are present, set status to `syncing`, run one immediate `synchronizeVault`, then start the interval. On cleanup, stop the interval and invalidate stale completions. On success, set `synced` and a timestamp; on retryable failure, set `error`; on metadata conflict, set `conflict`. `retry()` uses the same in-flight guard.

- [ ] **Step 5: Run scheduler tests and typecheck**

Run: `node --experimental-strip-types --test test/syncScheduler.test.ts` and `npm run typecheck`

Expected: scheduler tests pass and the hook compiles without React effect dependency warnings.

- [ ] **Step 6: Commit scheduling**

```powershell
git add src/lib/syncScheduler.ts src/lib/useVaultSync.ts test/syncScheduler.test.ts
git commit -m "feat: schedule encrypted vault sync every 30 minutes"
```

## Task 7: Wire Startup, Unlock, Session Lifecycle, And Status UI

**Files:**
- Create: `src/components/SyncStatus.tsx`
- Create: `src/lib/syncStatus.ts`
- Modify: `src/App.tsx`
- Modify: `src/views/Dashboard.tsx`
- Test: `test/syncStatus.test.ts`

**Interfaces:**
- `SyncStatus` accepts the `VaultSyncController` status/error/timestamp and an `onRetry` callback. It renders no payload or secret.
- `Workspace` receives `syncOwnerId: string | null` and mounts `useVaultSync(syncOwnerId, Boolean(syncOwnerId))`.

- [ ] **Step 1: Write the pure status helper tests**

```ts
test('labels sync states without exposing error details', () => {
  assert.equal(getSyncStatusLabel({ status: 'local' }), 'Local only');
  assert.equal(getSyncStatusLabel({ status: 'syncing' }), 'Syncing');
  assert.equal(getSyncStatusLabel({ status: 'synced', lastSyncedAt: '2026-08-19T00:00:00.000Z' }), 'Synced just now');
  assert.equal(getSyncStatusLabel({ status: 'error', error: 'network payload leaked' }), 'Sync failed, retry');
  assert.equal(getSyncStatusLabel({ status: 'conflict' }), 'Vault conflict');
  assert.equal(canRetrySync('conflict'), false);
});
```

- [ ] **Step 2: Run the focused test and verify the missing status helper failure**

Run: `node --experimental-strip-types --test test/syncStatus.test.ts`

Expected: FAIL because `syncStatus.ts` and its exported helpers do not exist.

- [ ] **Step 3: Bootstrap remote metadata before local setup**

In `VaultGate`, use the authenticated session user ID as `syncOwnerId`. Check local metadata first. If it is missing and Supabase is configured, call `bootstrapVaultMetadata` so a second device can unlock a remote-created vault. If the remote metadata request fails while no local vault exists, show a retryable preparation error instead of rendering vault setup; this prevents creating a new vault over an unreachable remote vault. If local metadata exists, allow local-first operation when bootstrap cannot reach the network and surface the error after unlock through sync status.

- [ ] **Step 4: Mount the sync lifecycle after unlock**

Pass `syncOwnerId` only when the active session user ID equals the vault owner. The workspace hook performs the immediate post-unlock sync and owns the 30-minute interval. When the session disappears, `syncOwnerId` becomes `null`, the scheduler cleans up, and the existing lock path runs. Do not change the close/restart lock policy.

- [ ] **Step 5: Add status and retry UI**

Render `SyncStatus` in the workspace sidebar or header. Use labels `Local only`, `Syncing`, `Synced just now`, `Sync failed, retry`, and `Vault conflict`. Retry calls `controller.retry()` and shows no error payload. Replace the Dashboard text `No cloud sync required` with copy that accurately states local encryption plus authenticated periodic sync.

- [ ] **Step 6: Run typecheck, lint, and focused tests**

Run: `npm run typecheck`, `npm run lint`, and `npm test`

Expected: all commands exit 0; existing settings/dashboard behavior remains intact.

- [ ] **Step 7: Commit lifecycle integration**

```powershell
git add src/App.tsx src/components/SyncStatus.tsx src/views/Dashboard.tsx
git commit -m "feat: wire authenticated vault sync lifecycle"
```

## Task 8: Update Security-Facing Documentation And Copy

**Files:**
- Modify: `src/views/SettingsView.tsx`
- Modify: `README.md`

- [ ] **Step 1: Write the documentation assertions**

Search for stale claims such as `future sync`, `No cloud sync required`, or descriptions that say data never leaves the device. The assertions are the absence of those claims and the presence of the exact behavior: Supabase Auth is required for sync, records remain AES-256-GCM encrypted, and sync runs immediately after unlock plus every 30 minutes while unlocked.

- [ ] **Step 2: Run the search before editing**

Run: `rg -n "future sync|No cloud sync required|never leaves|cloud sync" README.md src`

Expected: stale claims are found before the documentation change.

- [ ] **Step 3: Update only stale product copy**

State that local PGlite remains the working store, Supabase receives encrypted envelopes only, Supabase Auth is required for cloud sync, and the app retries on the 30-minute cadence. Do not claim end-to-end security or immunity from compromise.

- [ ] **Step 4: Run the search after editing**

Run: `rg -n "future sync|No cloud sync required|never leaves|cloud sync" README.md src`

Expected: only intentional, accurate cloud-sync references remain.

- [ ] **Step 5: Commit documentation**

```powershell
git add README.md src/views/SettingsView.tsx
git commit -m "docs: describe encrypted periodic vault sync"
```

## Task 9: Full Verification And Hosted Schema Check

**Files:**
- No source changes unless a verification failure identifies a concrete defect.

- [ ] **Step 1: Inspect the final diff and worktree**

Run: `git status --short`, `git diff --check`, and `git log --oneline -12`.

Expected: only intentional sync commits are present and the diff has no whitespace errors.

- [ ] **Step 2: Run all application tests**

Run: `npm test`

Expected: all existing and new Node tests pass with zero failures.

- [ ] **Step 3: Run static checks and web build**

Run: `npm run typecheck`, `npm run lint`, and `npm run build`.

Expected: all commands exit 0.

- [ ] **Step 4: Run desktop verification**

Run: `cargo check --manifest-path desktop/src-tauri/Cargo.toml`.

Expected: Rust desktop code compiles with the sync integration unchanged.

- [ ] **Step 5: Run Supabase schema lint**

Run: `npm run supabase:lint`.

Expected: linked database lint reports no schema errors, with RLS and encrypted payload constraints still present.

- [ ] **Step 6: Confirm the remote write path manually without reading secrets**

After signing in and unlocking a local vault in the app, check Supabase Table Editor for one or more rows in `public.vault_metadata` and `public.vault_records`. Inspect only `owner_id`, `record_type`, timestamps, and whether payloads contain the encrypted shape; do not copy or display ciphertext unnecessarily. Confirm the app reports a successful sync and that a second sync is idempotent.

- [ ] **Step 7: Record final evidence**

Capture the exact test/build/lint exit codes and row-count observation in the final response. If a check cannot run because the environment lacks a required service, report that limitation instead of claiming completion.
