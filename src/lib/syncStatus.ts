import type { SyncStatus } from './syncTypes.ts';

export interface SyncStatusView {
  status: SyncStatus;
  lastSyncedAt?: string | null;
  error?: string | null;
}

export function getSyncStatusLabel({ status }: SyncStatusView): string {
  if (status === 'syncing') return 'Syncing';
  if (status === 'synced') return 'Synced just now';
  if (status === 'error') return 'Sync failed, retry';
  if (status === 'conflict') return 'Vault conflict';
  return 'Local only';
}

export function canRetrySync(status: SyncStatus): boolean {
  return status === 'error';
}
