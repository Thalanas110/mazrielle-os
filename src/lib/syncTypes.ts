import type { EncryptedPayload, VaultEnvelope } from './crypto.ts';

export const SYNC_RECORD_TYPES = [
  'folder',
  'credential',
  'note',
  'task',
  'income',
  'activity_log',
  'app_settings',
] as const;

export type SyncRecordType = typeof SYNC_RECORD_TYPES[number];

export const LOCAL_SYNC_TABLES = [
  'folders',
  'credentials',
  'notes',
  'tasks',
  'income',
  'activity_log',
  'app_settings',
] as const;

export type LocalSyncTable = typeof LOCAL_SYNC_TABLES[number];

export interface RawLocalSyncRow {
  id: string;
  owner_id: string;
  folder_id?: string | null;
  payload: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface EncryptedSyncRow {
  id: string;
  owner_id: string;
  record_type: SyncRecordType;
  folder_id: string | null;
  payload: EncryptedPayload;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RemoteVaultMetadata {
  owner_id: string;
  envelope: VaultEnvelope;
  created_at: string;
  updated_at: string;
}

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error' | 'conflict';

export interface SyncResult {
  pushed: number;
  pulled: number;
  unchanged: number;
  lastSyncedAt: string;
}

export interface SyncStore {
  listRecords(ownerId: string): Promise<EncryptedSyncRow[]>;
  upsertRecord(row: EncryptedSyncRow): Promise<void>;
  getVaultMetadata(ownerId: string): Promise<RemoteVaultMetadata | null>;
  saveVaultMetadata(metadata: RemoteVaultMetadata): Promise<void>;
}

export interface SyncTransport {
  getAuthenticatedOwner(): Promise<string | null>;
  getVaultMetadata(ownerId: string): Promise<RemoteVaultMetadata | null>;
  upsertVaultMetadata(metadata: RemoteVaultMetadata): Promise<void>;
  listRecords(ownerId: string): Promise<EncryptedSyncRow[]>;
  upsertRecords(rows: EncryptedSyncRow[]): Promise<void>;
}
