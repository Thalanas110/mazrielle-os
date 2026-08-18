import { PGlite } from '@electric-sql/pglite';

const DATABASE_URL = 'idb://mazrielle-os-vault';

let dbInstance: PGlite | null = null;
let schemaPromise: Promise<void> | null = null;
let currentOwnerId: string | null = null;

export async function getDb(): Promise<PGlite> {
  if (!dbInstance) {
    dbInstance = new PGlite(DATABASE_URL);
    schemaPromise = initSchema(dbInstance);
  }
  await schemaPromise;
  if (currentOwnerId) await applyOwnerContext(dbInstance, currentOwnerId);
  return dbInstance;
}

export async function setVaultOwner(ownerId: string): Promise<void> {
  if (!ownerId.trim()) throw new Error('A vault owner is required');
  currentOwnerId = ownerId;
  const db = await getDb();
  await applyOwnerContext(db, ownerId);
}

export function getVaultOwner(): string {
  if (!currentOwnerId) throw new Error('Vault owner has not been configured');
  return currentOwnerId;
}

async function applyOwnerContext(db: PGlite, ownerId: string): Promise<void> {
  await db.query("SELECT set_config('app.user_id', $1, false)", [ownerId]);
}

async function initSchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vault_meta (
      owner_id TEXT PRIMARY KEY,
      envelope TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      folder_id TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      folder_id TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      folder_id TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      folder_id TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      folder_id TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      folder_id TEXT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    ALTER TABLE vault_meta ENABLE ROW LEVEL SECURITY;
    ALTER TABLE vault_meta FORCE ROW LEVEL SECURITY;
    ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE folders FORCE ROW LEVEL SECURITY;
    ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
    ALTER TABLE credentials FORCE ROW LEVEL SECURITY;
    ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notes FORCE ROW LEVEL SECURITY;
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
    ALTER TABLE income ENABLE ROW LEVEL SECURITY;
    ALTER TABLE income FORCE ROW LEVEL SECURITY;
    ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE activity_log FORCE ROW LEVEL SECURITY;
    ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE app_settings FORCE ROW LEVEL SECURITY;
  `);

  await createOwnerPolicy(db, 'vault_meta');
  await createOwnerPolicy(db, 'folders');
  await createOwnerPolicy(db, 'credentials');
  await createOwnerPolicy(db, 'notes');
  await createOwnerPolicy(db, 'tasks');
  await createOwnerPolicy(db, 'income');
  await createOwnerPolicy(db, 'activity_log');
  await createOwnerPolicy(db, 'app_settings');
}

async function createOwnerPolicy(db: PGlite, table: string): Promise<void> {
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${table}' AND policyname = '${table}_owner_policy'
      ) THEN
        CREATE POLICY ${table}_owner_policy ON ${table}
          USING (owner_id = current_setting('app.user_id', true))
          WITH CHECK (owner_id = current_setting('app.user_id', true));
      END IF;
    END
    $$;
  `);
}

export function genId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function now(): string {
  return new Date().toISOString();
}
