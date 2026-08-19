# Mazrielle OS

Mazrielle OS is a private, local-first workspace for credentials, notes, tasks, calendar data, and income tracking.

## Architecture

- `src/` contains the shared React application and platform-neutral domain/storage interfaces.
- `desktop/src-tauri/` contains the Tauri desktop shell and Rust-owned cryptography state.
- `android/` contains the Capacitor configuration and generated Android project.
- PGlite persists the local database in a fresh `idb://mazrielle-os-vault` store.
- `supabase/` contains the hosted sync schema, local Supabase CLI configuration, and no seed data.
- `src/lib/supabase.types.ts` is generated from the deployed Supabase schema.

## Security Model

1. Supabase email/password authentication is required before first-time local vault setup.
2. The local vault has a separate master passphrase with a minimum length of fourteen characters.
3. A random 256-bit vault key is wrapped by Argon2id-derived keys from both the master password and recovery key.
4. Vault payloads are encrypted with AES-256-GCM before they are written to PGlite.
5. PGlite tables enable and force row-level security using the current opaque owner context.
6. Supabase stores encrypted record payloads plus routing and sync metadata; it never receives decrypted vault values.
7. The desktop target keeps the active vault key in Rust memory. The browser/dev fallback uses Web Crypto; Android native crypto is reserved for the mobile implementation sprint.
8. The vault locks on app close/restart. Supabase logout preserves the encrypted local vault and requires the master password to unlock it offline.
9. The desktop WebView uses a restrictive CSP, notes preview as text, and does not load third-party favicon services.
10. Supabase sessions are memory-only; sensitive clipboard values are cleared after a short delay when the platform permits it.

No seed or demo records are inserted. Existing prototype data is not migrated.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Set the Supabase project values in `.env`:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_REDIRECT_URL=http://localhost:5173
```

## Supabase Setup

The repository is configured for project ref `ppidyrbfrswlkwlfmelw`. The migration creates only
encrypted vault metadata and encrypted record payloads. Both tables have forced RLS, owner-scoped
policies, and no anonymous grants. Seed execution is disabled.

Authenticate the Supabase CLI, then apply the migration:

```powershell
npx supabase login
npm run supabase:link
npm run supabase:lint
npm run supabase:push
npm run supabase:types
```

The hosted project must also allow the exact callback URLs used by each shell in Authentication > URL
Configuration: `http://localhost:5173`, `http://127.0.0.1:5173`, `tauri://localhost`,
`http://tauri.localhost`, `http://localhost`, and `capacitor://localhost`. Enable email/password
authentication and email confirmations in Authentication > Providers. Do not commit `.env` or any
Supabase access token.

## Sync Behavior

PGlite remains the local working store. After a successful local vault unlock, an authenticated
Supabase session triggers one encrypted reconciliation immediately and then every 30 minutes while
the app remains open and unlocked. The sync service transfers only AES-256-GCM envelopes and keeps
deletion tombstones so records are not resurrected. Signing out stops cloud sync; the encrypted local
vault remains available for offline use after a separate local unlock.

## Commands

```powershell
npm run dev
npm run build
npm run test
npm run typecheck
npm run lint
npm run desktop:dev
npm run desktop:build
npm run android:sync
npm run android:build
npm run supabase:lint
npm run supabase:types
```

The DOCX importer reads a local file, supports tables and labeled free-form text, shows an editable preview, and encrypts values only after confirmation. It does not access Google Drive.

## Android Prerequisites

Capacitor Android requires Android Studio, an installed Android SDK, and a supported JDK. On this machine, Android Studio's bundled JDK 21 is suitable for the generated Gradle project. Configure `ANDROID_HOME` or `android/android/local.properties` before running `npm run android:build`.
