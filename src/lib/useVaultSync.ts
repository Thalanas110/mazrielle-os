import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from './supabase.ts';
import {
  synchronizeVault,
  SyncAuthenticationError,
  SyncUnavailableError,
  VaultMetadataConflictError,
} from './sync.ts';
import { startSyncScheduler } from './syncScheduler.ts';
import type { SyncResult, SyncStatus } from './syncTypes.ts';

export interface VaultSyncController {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastResult: SyncResult | null;
  error: string | null;
  retry(): Promise<void>;
}

function errorMessage(error: unknown): string {
  if (error instanceof VaultMetadataConflictError) return 'Cloud vault metadata conflict';
  if (error instanceof SyncAuthenticationError) return 'Sign in again to sync';
  if (error instanceof SyncUnavailableError) return 'Cloud sync is unavailable';
  return 'Sync failed';
}

export function useVaultSync(ownerId: string | null, enabled: boolean): VaultSyncController {
  const [status, setStatus] = useState<SyncStatus>('local');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const runSync = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    if (!enabled || !ownerId || !isSupabaseConfigured()) {
      setStatus('local');
      setError(null);
      return;
    }

    const operation = (async () => {
      setStatus('syncing');
      setError(null);
      try {
        const result = await synchronizeVault(ownerId);
        setLastResult(result);
        setLastSyncedAt(result.lastSyncedAt);
        setStatus('synced');
      } catch (syncError) {
        setStatus(syncError instanceof VaultMetadataConflictError ? 'conflict' : 'error');
        setError(errorMessage(syncError));
      }
    })();
    inFlight.current = operation;
    try {
      await operation;
    } finally {
      if (inFlight.current === operation) inFlight.current = null;
    }
  }, [enabled, ownerId]);

  useEffect(() => {
    if (!enabled || !ownerId) {
      setStatus('local');
      setError(null);
      return undefined;
    }
    void runSync();
    return startSyncScheduler(runSync);
  }, [enabled, ownerId, runSync]);

  return { status, lastSyncedAt, lastResult, error, retry: runSync };
}
