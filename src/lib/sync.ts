import { isVaultUnlocked } from './vault.ts';
import { isSupabaseConfigured } from './supabase.ts';
import { createLocalSyncStore } from './syncLocalRepository.ts';
import { buildMergePlan } from './syncMerge.ts';
import { createSupabaseSyncTransport } from './syncTransport.ts';
import type { EncryptedSyncRow, RemoteVaultMetadata, SyncResult, SyncStore, SyncTransport } from './syncTypes.ts';

export const SYNC_INTERVAL_MS = 30 * 60 * 1000;

export class SyncUnavailableError extends Error {
  constructor() {
    super('Supabase sync is unavailable');
    this.name = 'SyncUnavailableError';
  }
}

export class SyncLockedError extends Error {
  constructor() {
    super('Vault is locked');
    this.name = 'SyncLockedError';
  }
}

export class SyncAuthenticationError extends Error {
  constructor() {
    super('Supabase authentication is required for sync');
    this.name = 'SyncAuthenticationError';
  }
}

export class VaultMetadataConflictError extends Error {
  constructor() {
    super('vault metadata conflict');
    this.name = 'VaultMetadataConflictError';
  }
}

export interface SyncDependencies {
  store: SyncStore;
  transport: SyncTransport;
  isUnlocked: () => boolean | Promise<boolean>;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(',')}}`;
}

function sameEnvelope(left: RemoteVaultMetadata, right: RemoteVaultMetadata): boolean {
  return stableSerialize(left.envelope) === stableSerialize(right.envelope);
}

function createDefaultDependencies(): SyncDependencies {
  if (!isSupabaseConfigured()) throw new SyncUnavailableError();
  return {
    store: createLocalSyncStore(),
    transport: createSupabaseSyncTransport(),
    isUnlocked: isVaultUnlocked,
  };
}

function resolveDependencies(dependencies?: SyncDependencies): SyncDependencies {
  return dependencies ?? createDefaultDependencies();
}

async function requireAuthenticatedOwner(ownerId: string, transport: SyncTransport): Promise<void> {
  const authenticatedOwner = await transport.getAuthenticatedOwner();
  if (!authenticatedOwner) throw new SyncAuthenticationError();
  if (authenticatedOwner !== ownerId) throw new SyncAuthenticationError();
}

async function readMetadataPair(ownerId: string, dependencies: SyncDependencies): Promise<{ local: RemoteVaultMetadata | null; remote: RemoteVaultMetadata | null }> {
  const local = await dependencies.store.getVaultMetadata(ownerId);
  const remote = await dependencies.transport.getVaultMetadata(ownerId);
  if (local && remote && !sameEnvelope(local, remote)) throw new VaultMetadataConflictError();
  return { local, remote };
}

export async function bootstrapVaultMetadata(ownerId: string, dependencies?: SyncDependencies): Promise<void> {
  const resolved = resolveDependencies(dependencies);
  await requireAuthenticatedOwner(ownerId, resolved.transport);
  const { local, remote } = await readMetadataPair(ownerId, resolved);
  if (!local && remote) await resolved.store.saveVaultMetadata(remote);
}

export async function synchronizeVault(ownerId: string, dependencies?: SyncDependencies): Promise<SyncResult> {
  const resolved = resolveDependencies(dependencies);
  if (!await resolved.isUnlocked()) throw new SyncLockedError();
  await requireAuthenticatedOwner(ownerId, resolved.transport);

  let { local: localMetadata, remote: remoteMetadata } = await readMetadataPair(ownerId, resolved);
  if (!localMetadata && remoteMetadata) {
    await resolved.store.saveVaultMetadata(remoteMetadata);
    localMetadata = remoteMetadata;
  }
  if (!localMetadata) throw new Error('Local vault metadata is missing');
  if (!remoteMetadata) {
    await resolved.transport.upsertVaultMetadata(localMetadata);
    remoteMetadata = localMetadata;
  }

  const localRows = await resolved.store.listRecords(ownerId);
  const remoteRows = await resolved.transport.listRecords(ownerId);
  const initialPlan = buildMergePlan(localRows, remoteRows);
  if (initialPlan.pushToRemote.length > 0) {
    await resolved.transport.upsertRecords(initialPlan.pushToRemote);
  }

  const authoritativeRemoteRows = initialPlan.pushToRemote.length > 0
    ? await resolved.transport.listRecords(ownerId)
    : remoteRows;
  const finalPlan = buildMergePlan(localRows, authoritativeRemoteRows);
  for (const row of finalPlan.applyToLocal) await resolved.store.upsertRecord(row);

  return {
    pushed: initialPlan.pushToRemote.length,
    pulled: finalPlan.applyToLocal.length,
    unchanged: finalPlan.unchanged,
    lastSyncedAt: new Date().toISOString(),
  };
}
