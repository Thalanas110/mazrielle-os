import { AlertTriangle, CheckCircle2, Cloud, LoaderCircle, RefreshCw } from 'lucide-react';
import type { VaultSyncController } from '@/lib/useVaultSync';
import { canRetrySync, getSyncStatusLabel } from '@/lib/syncStatus';

export default function SyncStatus({ controller }: { controller: VaultSyncController }) {
  const retryable = canRetrySync(controller.status);
  const label = getSyncStatusLabel(controller);
  const Icon = controller.status === 'syncing'
    ? LoaderCircle
    : controller.status === 'conflict' || controller.status === 'error'
      ? AlertTriangle
      : controller.status === 'synced'
        ? CheckCircle2
        : Cloud;

  return (
    <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/60">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${controller.status === 'syncing' ? 'animate-spin text-blue-500' : controller.status === 'error' || controller.status === 'conflict' ? 'text-amber-500' : controller.status === 'synced' ? 'text-green-500' : 'text-gray-400'}`} />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
      {retryable && (
        <button className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" aria-label="Retry sync" onClick={() => void controller.retry()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
