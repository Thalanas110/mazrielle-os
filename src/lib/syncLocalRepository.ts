import { getDb, setVaultOwner } from './db.ts';
import { queryRows } from './queryRows.ts';
import { assertEncryptedPayload, assertRemoteRecord, assertRemoteVaultMetadata, assertVaultEnvelope } from './syncValidation.ts';
import {
  LOCAL_SYNC_TABLES,
  type EncryptedSyncRow,
  type LocalSyncTable,
  type RawLocalSyncRow,
  type RemoteVaultMetadata,
  type SyncRecordType,
  type SyncStore,
} from './syncTypes.ts';

const RECORD_TYPE_BY_TABLE: Record<LocalSyncTable, SyncRecordType> = {
  folders: 'folder',
  credentials: 'credential',
  notes: 'note',
  tasks: 'task',
  income: 'income',
  activity_log: 'activity_log',
  app_settings: 'app_settings',
};

const TABLE_BY_RECORD_TYPE: Record<SyncRecordType, LocalSyncTable> = {
  folder: 'folders',
  credential: 'credentials',
  note: 'notes',
  task: 'tasks',
  income: 'income',
  activity_log: 'activity_log',
  app_settings: 'app_settings',
};

function assertOwner(ownerId: string): void {
  if (!ownerId.trim()) throw new Error('A sync owner is required');
}

export function parseLocalEncryptedRow(table: LocalSyncTable, row: RawLocalSyncRow): EncryptedSyncRow {
  const payload = (() => {
    try {
      return assertEncryptedPayload(JSON.parse(row.payload));
    } catch {
      throw new Error('Invalid local encrypted payload');
    }
  })();

  return assertRemoteRecord({
    id: row.id,
    owner_id: row.owner_id,
    record_type: RECORD_TYPE_BY_TABLE[table],
    folder_id: row.folder_id ?? null,
    payload,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
  }, row.owner_id);
}

async function setSyncOwner(ownerId: string): Promise<void> {
  assertOwner(ownerId);
  await setVaultOwner(ownerId);
}

async function listRecords(ownerId: string): Promise<EncryptedSyncRow[]> {
  await setSyncOwner(ownerId);
  const db = await getDb();
  const rows: EncryptedSyncRow[] = [];
  for (const table of LOCAL_SYNC_TABLES) {
    const result = await db.query<RawLocalSyncRow>(
      `SELECT id, owner_id, folder_id, payload, created_at, updated_at, deleted_at FROM ${table} WHERE owner_id=$1`,
      [ownerId],
    );
    rows.push(...queryRows(result).map(row => parseLocalEncryptedRow(table, row)));
  }
  return rows;
}

async function upsertRecord(row: EncryptedSyncRow): Promise<void> {
  await setSyncOwner(row.owner_id);
  const validated = assertRemoteRecord(row, row.owner_id);
  const table = TABLE_BY_RECORD_TYPE[validated.record_type];
  const db = await getDb();
  await db.query(
    `INSERT INTO ${table} (id, owner_id, folder_id, payload, created_at, updated_at, deleted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET
       owner_id=excluded.owner_id,
       folder_id=excluded.folder_id,
       payload=excluded.payload,
       created_at=excluded.created_at,
       updated_at=excluded.updated_at,
       deleted_at=excluded.deleted_at`,
    [validated.id, validated.owner_id, validated.folder_id, JSON.stringify(validated.payload), validated.created_at, validated.updated_at, validated.deleted_at],
  );
}

async function getVaultMetadata(ownerId: string): Promise<RemoteVaultMetadata | null> {
  await setSyncOwner(ownerId);
  const db = await getDb();
  const result = await db.query<Record<string, unknown>>(
    'SELECT owner_id, envelope, created_at, updated_at FROM vault_meta WHERE owner_id=$1',
    [ownerId],
  );
  const row = queryRows(result)[0];
  if (!row) return null;
  let envelope: unknown;
  try {
    envelope = JSON.parse(String(row.envelope));
  } catch {
    throw new Error('Invalid local vault envelope');
  }
  return assertRemoteVaultMetadata({
    owner_id: String(row.owner_id),
    envelope: assertVaultEnvelope(envelope),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }, ownerId);
}

async function saveVaultMetadata(metadata: RemoteVaultMetadata): Promise<void> {
  await setSyncOwner(metadata.owner_id);
  const validated = assertRemoteVaultMetadata(metadata, metadata.owner_id);
  const db = await getDb();
  await db.query(
    `INSERT INTO vault_meta (owner_id, envelope, created_at, updated_at)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (owner_id) DO UPDATE SET envelope=excluded.envelope, updated_at=excluded.updated_at`,
    [validated.owner_id, JSON.stringify(validated.envelope), validated.created_at, validated.updated_at],
  );
}

export function createLocalSyncStore(): SyncStore {
  return { listRecords, upsertRecord, getVaultMetadata, saveVaultMetadata };
}
