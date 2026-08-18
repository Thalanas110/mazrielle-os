import { getDb, genId, getVaultOwner, now } from './db';
import { getVaultCryptoProvider } from './platformCrypto';
import { queryRows } from './queryRows';

export type EncryptedTable = 'folders' | 'credentials' | 'notes' | 'tasks' | 'income' | 'activity_log' | 'app_settings';

export interface StoredRecord<T> {
  id: string;
  owner_id: string;
  folder_id: string | null;
  value: T;
  created_at: string;
  updated_at: string;
}

interface StoredRow {
  id: string;
  owner_id: string;
  folder_id?: string | null;
  payload: string;
  created_at: string;
  updated_at: string;
}

async function encrypt(value: unknown): Promise<string> {
  const crypto = await getVaultCryptoProvider();
  return JSON.stringify(await crypto.encrypt(JSON.stringify(value)));
}

async function decrypt<T>(payload: string): Promise<T> {
  const crypto = await getVaultCryptoProvider();
  return JSON.parse(await crypto.decrypt(JSON.parse(payload))) as T;
}

export async function insertRecord<T>(table: EncryptedTable, value: T, folderId: string | null = null, id = genId()): Promise<StoredRecord<T>> {
  const ownerId = getVaultOwner();
  const timestamp = now();
  const db = await getDb();
  const payload = await encrypt(value);
  await db.query(
    `INSERT INTO ${table} (id, owner_id, folder_id, payload, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$5)`,
    [id, ownerId, folderId, payload, timestamp],
  );
  return { id, owner_id: ownerId, folder_id: folderId, value, created_at: timestamp, updated_at: timestamp };
}

export async function insertSettings<T>(value: T, id: string): Promise<StoredRecord<T>> {
  const ownerId = getVaultOwner();
  const timestamp = now();
  const db = await getDb();
  const payload = await encrypt(value);
  await db.query(
    `INSERT INTO app_settings (id, owner_id, payload, created_at, updated_at) VALUES ($1,$2,$3,$4,$4)`,
    [id, ownerId, payload, timestamp],
  );
  return { id, owner_id: ownerId, folder_id: null, value, created_at: timestamp, updated_at: timestamp };
}

export async function listRecords<T>(table: EncryptedTable, folderId?: string | null): Promise<StoredRecord<T>[]> {
  const db = await getDb();
  const result = folderId === undefined
    ? await db.query<StoredRow>(`SELECT id, owner_id, folder_id, payload, created_at, updated_at FROM ${table} WHERE deleted_at IS NULL`)
    : await db.query<StoredRow>(`SELECT id, owner_id, folder_id, payload, created_at, updated_at FROM ${table} WHERE deleted_at IS NULL AND folder_id IS NOT DISTINCT FROM $1`, [folderId]);
  const rows = queryRows(result);
  return Promise.all(rows.map(async row => ({
    id: String(row.id),
    owner_id: String(row.owner_id),
    folder_id: row.folder_id ? String(row.folder_id) : null,
    value: await decrypt<T>(String(row.payload)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  })));
}

export async function getRecord<T>(table: EncryptedTable, id: string): Promise<StoredRecord<T> | null> {
  const db = await getDb();
  const result = table === 'app_settings'
    ? await db.query<StoredRow>(`SELECT id, owner_id, payload, created_at, updated_at FROM ${table} WHERE id=$1 AND deleted_at IS NULL`, [id])
    : await db.query<StoredRow>(`SELECT id, owner_id, folder_id, payload, created_at, updated_at FROM ${table} WHERE id=$1 AND deleted_at IS NULL`, [id]);
  const row = queryRows(result)[0];
  if (!row) return null;
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    folder_id: row.folder_id ? String(row.folder_id) : null,
    value: await decrypt<T>(String(row.payload)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function updateRecord<T>(table: EncryptedTable, id: string, value: T, folderId?: string | null): Promise<void> {
  const db = await getDb();
  const payload = await encrypt(value);
  if (folderId === undefined) {
    await db.query(`UPDATE ${table} SET payload=$1, updated_at=$2 WHERE id=$3 AND deleted_at IS NULL`, [payload, now(), id]);
  } else {
    await db.query(`UPDATE ${table} SET folder_id=$1, payload=$2, updated_at=$3 WHERE id=$4 AND deleted_at IS NULL`, [folderId, payload, now(), id]);
  }
}

export async function softDeleteRecord(table: EncryptedTable, id: string): Promise<void> {
  const db = await getDb();
  const timestamp = now();
  await db.query(`UPDATE ${table} SET deleted_at=$1, updated_at=$1 WHERE id=$2 AND deleted_at IS NULL`, [timestamp, id]);
}

export async function clearRecords(table: EncryptedTable): Promise<void> {
  const db = await getDb();
  const timestamp = now();
  await db.query(`UPDATE ${table} SET deleted_at=$1, updated_at=$1 WHERE deleted_at IS NULL`, [timestamp]);
}
