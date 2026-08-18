import { getDb, getVaultOwner, genId, now, setVaultOwner } from './db.ts';
import { queryRows } from './queryRows.ts';
import { getVaultCryptoProvider } from './platformCrypto.ts';
import type { VaultEnvelope } from './crypto.ts';
import type { VaultMetadata } from './types.ts';

export const MIN_MASTER_PASSWORD_LENGTH = 8;

export function validateMasterPassword(password: string): string | null {
  return password.length >= MIN_MASTER_PASSWORD_LENGTH ? null : 'Master password must be at least 8 characters';
}

export function generateRecoveryKey(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % 4 === 0) result += '-';
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}

export async function getVaultMetadata(ownerId: string): Promise<VaultMetadata | null> {
  await setVaultOwner(ownerId);
  const db = await getDb();
  const result = await db.query<Record<string, unknown>>(
    'SELECT owner_id, envelope, created_at, updated_at FROM vault_meta WHERE owner_id=$1',
    [ownerId],
  );
  const row = queryRows(result)[0];
  if (!row) return null;
  return {
    owner_id: String(row.owner_id),
    envelope: JSON.parse(String(row.envelope)) as VaultEnvelope,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function hasVault(ownerId: string): Promise<boolean> {
  return (await getVaultMetadata(ownerId)) !== null;
}

export async function createVault(ownerId: string, masterPassword: string): Promise<string> {
  const validationError = validateMasterPassword(masterPassword);
  if (validationError) throw new Error(validationError);
  await setVaultOwner(ownerId);
  const recoveryKey = generateRecoveryKey();
  const crypto = await getVaultCryptoProvider();
  const envelope = await crypto.setup(masterPassword, recoveryKey);
  const timestamp = now();
  const db = await getDb();
  await db.query(
    `INSERT INTO vault_meta (owner_id, envelope, created_at, updated_at) VALUES ($1,$2,$3,$3)`,
    [ownerId, JSON.stringify(envelope), timestamp],
  );
  return recoveryKey;
}

export async function unlockVault(ownerId: string, secret: string): Promise<void> {
  const metadata = await getVaultMetadata(ownerId);
  if (!metadata) throw new Error('Vault has not been set up');
  const crypto = await getVaultCryptoProvider();
  await crypto.unlock(secret, metadata.envelope);
  await setVaultOwner(ownerId);
}

export async function lockVault(): Promise<void> {
  const crypto = await getVaultCryptoProvider();
  crypto.lock();
}

export async function isVaultUnlocked(): Promise<boolean> {
  const crypto = await getVaultCryptoProvider();
  return crypto.isUnlocked();
}

export function requireVaultOwner(): string {
  return getVaultOwner();
}

export function createOwnerSettingsId(ownerId: string): string {
  return `${ownerId}:settings`;
}

export function createRecordId(): string {
  return genId();
}
