import { useEffect, useState } from 'react';
import { KeyRound, StickyNote, SquareCheckBig, TrendingUp, Clock, AlertCircle, ChevronRight, ShieldCheck } from 'lucide-react';
import { getCredentials, getNotes, getTasks, getIncome, getActivityLog } from '@/lib/api';
import type { Credential, Note, Task, Income, ActivityLog } from '@/lib/types';
import { formatRelative, isOverdue, formatCurrency, formatTime } from '@/lib/utils';
import type { AppSettings } from '@/lib/types';
import { formatWorldClockTime, getWorldClockOption, type WorldClockOption } from '@/lib/worldClocks';

interface DashboardProps {
  onNavigate: (view: string) => void;
  settings: AppSettings;
}

export default function Dashboard({ onNavigate, settings }: DashboardProps) {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    Promise.all([
      getCredentials(), getNotes(), getTasks(), getIncome(), getActivityLog(),
    ]).then(([c, n, t, i, a]) => {
      setCreds(c); setNotes(n); setTasks(t); setIncome(i); setActivity(a);
    });
  }, []);

  const overdueTasks = tasks.filter(t => t.status !== 'completed' && isOverdue(t.due_date));
  const upcomingTasks = tasks.filter(t => t.status !== 'completed' && !isOverdue(t.due_date)).slice(0, 5);
  const recentCreds = creds.slice(0, 4);
  const now = new Date();
  const monthIncome = income.filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, i) => sum + i.amount, 0);
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);

  const stats = [
    { label: 'Credentials', value: creds.length, icon: KeyRound, color: 'from-blue-500 to-blue-600', view: 'vault' },
    { label: 'Notes', value: notes.length, icon: StickyNote, color: 'from-amber-500 to-amber-600', view: 'notes' },
    { label: 'Tasks', value: tasks.filter(t => t.status !== 'completed').length, icon: SquareCheckBig, color: 'from-green-500 to-green-600', view: 'tasks' },
    { label: 'This Month', value: formatCurrency(monthIncome, 'PHP'), icon: TrendingUp, color: 'from-purple-500 to-purple-600', view: 'income' },
  ];

  const [clockNow, setClockNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedClocks = settings.world_clocks
    .map(timeZone => getWorldClockOption(timeZone, clockNow))
    .filter((clock): clock is WorldClockOption => Boolean(clock));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Welcome back, {settings.display_name}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => onNavigate(s.view)}
            className="card group p-4 text-left transition-all hover:shadow-md active:scale-95"
          >
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${s.color} shadow-sm`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</div>
            <div className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">{s.value}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Overdue Tasks</h2>
                <span className="badge bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">{overdueTasks.length}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {overdueTasks.map(t => (
                  <button key={t.id} onClick={() => onNavigate('tasks')} className="flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className={`h-2 w-2 rounded-full ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <span className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-white">{t.title}</span>
                    <span className="text-xs text-red-500">{formatRelative(t.due_date || '')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming tasks */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Tasks</h2>
              <button onClick={() => onNavigate('tasks')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {upcomingTasks.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No upcoming tasks</div>
              ) : upcomingTasks.map(t => (
                <button key={t.id} onClick={() => onNavigate('tasks')} className="flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className={`h-2 w-2 rounded-full ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <span className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-white">{t.title}</span>
                  {t.due_date && <span className="text-xs text-gray-400">{formatRelative(t.due_date)}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Recent credentials */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Credentials</h2>
              <button onClick={() => onNavigate('vault')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800">
              {recentCreds.length === 0 ? (
                <div className="col-span-2 bg-white px-5 py-8 text-center text-sm text-gray-400 dark:bg-[#131316]">No credentials yet</div>
              ) : recentCreds.map(c => (
                <button key={c.id} onClick={() => onNavigate('vault')} className="flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:bg-[#131316] dark:hover:bg-gray-800/50">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {c.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{c.title}</div>
                    <div className="truncate text-xs text-gray-400">{c.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* World clocks */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
              <Clock className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">World Clocks</h2>
            </div>
            <div className="space-y-1 p-2">
              {selectedClocks.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No clocks selected</p>
                  <button onClick={() => onNavigate('settings-world-clocks')} className="btn-ghost mt-2 text-xs">
                    Add a city in Settings
                  </button>
                </div>
              ) : selectedClocks.map(clock => (
                <div key={clock.timeZone} className="flex items-center justify-between rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <span className="block truncate text-sm text-gray-600 dark:text-gray-400">{clock.city}</span>
                    <span className="block text-[10px] text-gray-400">{clock.utcOffset}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                    {formatWorldClockTime(clock.timeZone, clockNow)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Vault protection */}
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Vault Protected</h2>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Your data is stored locally and encrypted. No cloud sync required.
            </p>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
              <span className="text-xs text-gray-500 dark:text-gray-400">Total Income</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(totalIncome, 'PHP')}</span>
            </div>
          </div>

          {/* Recent activity */}
          <div className="card overflow-hidden">
            <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {activity.slice(0, 8).map(a => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-2.5">
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-gray-900 dark:text-gray-200">
                        <span className="font-medium">{a.action}</span> {a.item_name}
                      </div>
                      <div className="text-[10px] text-gray-400">{a.module} · {formatTime(a.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
