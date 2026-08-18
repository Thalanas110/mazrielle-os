import { useEffect, useState } from 'react';
import { Clock, Trash2, KeyRound, StickyNote, SquareCheckBig, TrendingUp, Folder as FolderIcon, Settings as SettingsIcon } from 'lucide-react';
import { getActivityLog, clearActivityLog } from '@/lib/api';
import type { ActivityLog as ActivityLogType } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/Modal';
import { formatTime, formatDate } from '@/lib/utils';

const MODULE_ICONS: Record<string, typeof Clock> = {
  Vault: KeyRound,
  Notes: StickyNote,
  Tasks: SquareCheckBig,
  Income: TrendingUp,
  Folders: FolderIcon,
  Settings: SettingsIcon,
};

const ACTION_COLORS: Record<string, string> = {
  Created: 'text-green-500',
  Updated: 'text-blue-500',
  Deleted: 'text-red-500',
  Imported: 'text-amber-500',
  Backup: 'text-purple-500',
  Reset: 'text-red-500',
};

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [showClear, setShowClear] = useState(false);

  const load = async () => { setLogs(await getActivityLog()); };
  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Activity Log"
        subtitle="Track important actions inside Mazrielle OS"
        actions={
          logs.length > 0 ? (
            <button className="btn-ghost flex items-center gap-2 border border-gray-200 dark:border-gray-800" onClick={() => setShowClear(true)}>
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          ) : undefined
        }
      />

      {logs.length === 0 ? (
        <EmptyState icon={<Clock className="h-7 w-7" />} title="No activity yet" message="Actions like creating, updating, or deleting items will appear here." />
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {logs.map(log => {
            const Icon = MODULE_ICONS[log.module] ?? Clock;
            const actionColor = ACTION_COLORS[log.action] ?? 'text-gray-500';
            return (
              <div key={log.id} className="flex items-start gap-3 p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900 dark:text-white">
                    <span className={`font-medium ${actionColor}`}>{log.action}</span>{' '}
                    <span className="font-medium">{log.item_name}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {log.module} · {formatDate(log.created_at)} at {formatTime(log.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={showClear}
        onClose={() => setShowClear(false)}
        onConfirm={async () => { await clearActivityLog(); await load(); }}
        title="Clear activity log?"
        message="This will permanently delete all activity records. This cannot be undone."
      />
    </div>
  );
}
