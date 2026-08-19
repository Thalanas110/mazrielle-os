import type { EncryptedPayload, VaultEnvelope, WrappedKey } from './crypto.ts';
import { SYNC_RECORD_TYPES, type EncryptedSyncRow, type RemoteVaultMetadata, type SyncRecordType } from './syncTypes.ts';

const ENCRYPTED_PAYLOAD_KEYS = ['algorithm', 'ciphertext', 'nonce', 'version'];
const WRAPPED_KEY_KEYS = ['algorithm', 'ciphertext', 'iterations', 'kdf', 'memory_size', 'nonce', 'parallelism', 'salt'];
const VAULT_ENVELOPE_KEYS = ['password', 'recovery', 'version'];
const REMOTE_ROW_KEYS = ['created_at', 'deleted_at', 'folder_id', 'id', 'owner_id', 'payload', 'record_type', 'updated_at'];
const REMOTE_METADATA_KEYS = ['created_at', 'envelope', 'owner_id', 'updated_at'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isSyncRecordType(value: unknown): value is SyncRecordType {
  return typeof value === 'string' && (SYNC_RECORD_TYPES as readonly string[]).includes(value);
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!isRecord(value) || !hasExactKeys(value, ENCRYPTED_PAYLOAD_KEYS)) return false;
  return value.version === 1
    && value.algorithm === 'AES-256-GCM'
    && isNonEmptyString(value.nonce)
    && isNonEmptyString(value.ciphertext);
}

export function assertEncryptedPayload(value: unknown): EncryptedPayload {
  if (!isEncryptedPayload(value)) throw new Error('Invalid encrypted payload');
  return value;
}

function isWrappedKey(value: unknown): value is WrappedKey {
  if (!isRecord(value) || !hasExactKeys(value, WRAPPED_KEY_KEYS)) return false;
  return value.algorithm === 'AES-256-GCM'
    && value.kdf === 'Argon2id'
    && isNonEmptyString(value.salt)
    && isNonEmptyString(value.nonce)
    && isNonEmptyString(value.ciphertext)
    && typeof value.memory_size === 'number'
    && value.memory_size > 0
    && typeof value.iterations === 'number'
    && value.iterations > 0
    && typeof value.parallelism === 'number'
    && value.parallelism > 0;
}

export function assertVaultEnvelope(value: unknown): VaultEnvelope {
  if (!isRecord(value) || !hasExactKeys(value, VAULT_ENVELOPE_KEYS) || value.version !== 1 || !isWrappedKey(value.password) || !isWrappedKey(value.recovery)) {
    throw new Error('Invalid vault envelope');
  }
  return value as unknown as VaultEnvelope;
}

export function assertRemoteVaultMetadata(value: unknown, ownerId: string): RemoteVaultMetadata {
  if (!isRecord(value) || !hasExactKeys(value, REMOTE_METADATA_KEYS)) throw new Error('Invalid remote vault metadata');
  if (value.owner_id !== ownerId) throw new Error('Remote vault metadata owner mismatch');
  if (!isTimestamp(value.created_at) || !isTimestamp(value.updated_at)) throw new Error('Invalid remote vault metadata timestamp');
  return {
    owner_id: value.owner_id,
    envelope: assertVaultEnvelope(value.envelope),
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

export function assertRemoteRecord(value: unknown, ownerId: string): EncryptedSyncRow {
  if (!isRecord(value) || !hasExactKeys(value, REMOTE_ROW_KEYS)) throw new Error('Invalid remote record');
  if (value.owner_id !== ownerId) throw new Error('Remote record owner mismatch');
  if (!isNonEmptyString(value.id)) throw new Error('Invalid remote record ID');
  if (!isSyncRecordType(value.record_type)) throw new Error('Invalid remote record type');
  if (value.folder_id !== null && !isNonEmptyString(value.folder_id)) throw new Error('Invalid remote record folder');
  if (!isTimestamp(value.created_at) || !isTimestamp(value.updated_at) || (value.deleted_at !== null && !isTimestamp(value.deleted_at))) {
    throw new Error('Invalid remote record timestamp');
  }
  return {
    id: value.id,
    owner_id: value.owner_id,
    record_type: value.record_type,
    folder_id: value.folder_id,
    payload: assertEncryptedPayload(value.payload),
    created_at: value.created_at,
    updated_at: value.updated_at,
    deleted_at: value.deleted_at,
  };
}
