import { useState } from 'react';
import { User, Palette, ShieldCheck, Database, Info, Check } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import DocxImportPanel from '@/components/DocxImportPanel';

const ACCENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];
const THEMES = [
  { id: 'light' as const, label: 'Light', colors: ['#ffffff', '#f9fafb', '#e5e7eb'] },
  { id: 'dark' as const, label: 'Dark', colors: ['#0a0a0b', '#131316', '#1a1a1e'] },
];
const FONT_SIZES = [
  { id: 'small' as const, label: 'Small' },
  { id: 'medium' as const, label: 'Medium' },
  { id: 'large' as const, label: 'Large' },
];

type Tab = 'account' | 'appearance' | 'security' | 'data' | 'about';

export default function SettingsView({ settings, update, accountEmail, onSignOut }: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  accountEmail?: string | null;
  onSignOut?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('account');
  const [saved, setSaved] = useState(false);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Settings" subtitle="Manage account, appearance, security, and data" />

      <div className="flex flex-col gap-6 sm:flex-row">
        {/* Tabs */}
        <div className="flex shrink-0 gap-1 overflow-x-auto scrollbar-thin sm:w-48 sm:flex-col">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card flex-1 p-6">
          {tab === 'account' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Account</h2>
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white">
                  {settings.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{settings.display_name}</div>
                  <div className="text-xs text-gray-400">{accountEmail ?? 'Offline local vault'}</div>
                </div>
              </div>
              {onSignOut && <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800" onClick={onSignOut}>Sign out of Supabase</button>}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Display Name</label>
                <input
                  className="input"
                  value={settings.display_name}
                  onChange={e => { update({ display_name: e.target.value }); showSaved(); }}
                  placeholder="Your name"
                />
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Appearance</h2>
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-500">Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { update({ theme: t.id }); showSaved(); }}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${settings.theme === t.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-800'}`}
                    >
                      <div className="flex gap-1">
                        {t.colors.map(c => <div key={c} className="h-6 w-6 rounded" style={{ backgroundColor: c }} />)}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-500">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { update({ accent_color: c }); showSaved(); }}
                      className={`h-9 w-9 rounded-lg transition-all ${settings.accent_color === c ? 'ring-2 ring-offset-2 dark:ring-offset-[#131316]' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-500">Font Size</label>
                <div className="flex gap-2">
                  {FONT_SIZES.map(f => (
                    <button
                      key={f.id}
                      onClick={() => { update({ font_size: f.id }); showSaved(); }}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${settings.font_size === f.id ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Security</h2>
              <ToggleRow
                label="Auto-lock"
                description="Lock the vault when the app closes or restarts"
                value={settings.auto_lock}
                onChange={v => { update({ auto_lock: v }); showSaved(); }}
              />
              <ToggleRow
                label="Clipboard safety"
                description="Clear clipboard after copying passwords"
                value={settings.clipboard_clear}
                onChange={v => { update({ clipboard_clear: v }); showSaved(); }}
              />
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Encryption Active</span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Vault payloads are protected with AES-256-GCM and Argon2id. The local vault key is held only while unlocked.
                </p>
              </div>
            </div>
          )}

          {tab === 'data' && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Data Management</h2>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Encrypted Backup</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Export an encrypted backup of your vault data.</p>
                <button className="btn-ghost mt-3 border border-gray-200 dark:border-gray-800" disabled>Export Backup (Coming Soon)</button>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Local backup source</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Imported values are reviewed before they are encrypted into the vault.</p>
              </div>
              <DocxImportPanel />
              <div className="rounded-lg border border-red-200 p-4 dark:border-red-500/20">
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Reset Vault</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Permanently delete all data and start fresh.</p>
                <button className="mt-3 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-95" disabled>Reset Vault</button>
              </div>
            </div>
          )}

          {tab === 'about' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">About Mazrielle OS</h2>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">Mazrielle OS</div>
                  <div className="text-xs text-gray-400">Version 1.0.0</div>
                </div>
              </div>
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">
                Mazrielle OS is a private, local-first Life OS that brings passwords, notes, tasks, calendar, and income tracking into one secure workspace. Local vault content is encrypted before it reaches PGlite; future sync will require a fresh Supabase session.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <div className="text-xs text-gray-400">Developer</div>
                  <div className="font-medium text-gray-900 dark:text-white">Ren</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <div className="text-xs text-gray-400">Architecture</div>
                  <div className="font-medium text-gray-900 dark:text-white">Local-first vault</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {['React', 'TypeScript', 'Vite', 'PGlite', 'Lucide Icons'].map(t => (
                  <span key={t} className="badge bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t}</span>
                ))}
              </div>
            </div>
          )}

          {saved && (
            <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-fade-in">
              <Check className="h-4 w-4" /> Saved
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
      >
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
