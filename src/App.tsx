import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutDashboard, KeyRound, StickyNote, SquareCheckBig, Calendar, TrendingUp, Folder, Star, WandSparkles, Clock, Settings, Menu, X, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/lib/useSettings';
import { getRememberedVaultOwner, hasVault, isVaultUnlocked, lockVault, rememberVaultOwner } from '@/lib/vault';
import { isSupabaseConfigured, signOut } from '@/lib/supabase';
import { useAuthSession } from '@/lib/useAuthSession';
import AuthPage from '@/components/AuthPage';
import VaultSetup from '@/components/VaultSetup';
import VaultUnlock from '@/components/VaultUnlock';
import { getInitials } from '@/lib/utils';
import Dashboard from '@/views/Dashboard';
import Vault from '@/views/Vault';
import Notes from '@/views/Notes';
import Tasks from '@/views/Tasks';
import CalendarView from '@/views/CalendarView';
import Income from '@/views/Income';
import Folders from '@/views/Folders';
import Favorites from '@/views/Favorites';
import PasswordGenerator from '@/views/PasswordGenerator';
import ActivityLog from '@/views/ActivityLog';
import SettingsView from '@/views/SettingsView';

type ViewId = 'dashboard' | 'vault' | 'notes' | 'tasks' | 'calendar' | 'income' | 'folders' | 'favorites' | 'generator' | 'activity' | 'settings';

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'vault', label: 'Vault', icon: KeyRound },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'tasks', label: 'Tasks', icon: SquareCheckBig },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'income', label: 'Income', icon: TrendingUp },
];

const ORG_ITEMS: { id: ViewId; label: string; icon: typeof Folder }[] = [
  { id: 'folders', label: 'Folders', icon: Folder },
  { id: 'favorites', label: 'Favorites', icon: Star },
];

const TOOLS_ITEMS: { id: ViewId; label: string; icon: typeof WandSparkles }[] = [
  { id: 'generator', label: 'Generate Password', icon: WandSparkles },
  { id: 'activity', label: 'Activity Log', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function App() {
  const { session, loading } = useAuthSession();
  const [rememberedOwner, setRememberedOwner] = useState(() => getRememberedVaultOwner());
  const previousSession = useRef(session);

  useEffect(() => {
    if (previousSession.current && !session) void lockVault();
    previousSession.current = session;
  }, [session]);

  useEffect(() => {
    if (session) {
      rememberVaultOwner(session.user.id);
      setRememberedOwner(session.user.id);
    }
  }, [session]);

  useEffect(() => {
    const handleClose = () => { void lockVault(); };
    window.addEventListener('beforeunload', handleClose);
    return () => window.removeEventListener('beforeunload', handleClose);
  }, []);

  if (loading) return <LoadingScreen label="Checking session..." />;
  const ownerId = session?.user.id ?? rememberedOwner;
  if (!ownerId) return <AuthPage configured={isSupabaseConfigured()} />;
  return <VaultGate ownerId={ownerId} email={session?.user.email ?? null} />;
}

function VaultGate({ ownerId, email }: { ownerId: string; email: string | null }) {
  const [checking, setChecking] = useState(true);
  const [hasLocalVault, setHasLocalVault] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    const [localVault, isUnlocked] = await Promise.all([hasVault(ownerId), isVaultUnlocked()]);
    setHasLocalVault(localVault);
    setUnlocked(localVault && isUnlocked);
    setChecking(false);
  }, [ownerId]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (checking) return <LoadingScreen label="Preparing local vault..." />;
  if (!hasLocalVault) return <VaultSetup ownerId={ownerId} onReady={() => { setHasLocalVault(true); setUnlocked(true); }} />;
  if (!unlocked) return <VaultUnlock ownerId={ownerId} onUnlocked={() => setUnlocked(true)} />;
  return <Workspace email={email} />;
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0b]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative"><div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg"><ShieldCheck className="h-7 w-7 text-white" /></div><div className="absolute inset-0 animate-ping rounded-2xl bg-blue-500 opacity-20" /></div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  );
}

function Workspace({ email }: { email: string | null }) {
  const { settings, update, loaded } = useSettings();
  const [view, setView] = useState<ViewId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!loaded) return <LoadingScreen label="Loading Mazrielle OS..." />;

  const navItem = (item: { id: ViewId; label: string; icon: typeof LayoutDashboard }) => (
    <button
      key={item.id}
      onClick={() => { setView(item.id); setSidebarOpen(false); }}
      className={`sidebar-item w-full ${view === item.id ? 'sidebar-item-active' : ''}`}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      <span>{item.label}</span>
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0a0a0b]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static z-40 flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-[#0d0d10] transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Mazrielle OS</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Local-first vault</div>
            </div>
          </div>
          <button className="btn-icon md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-thin px-3 pb-4">
          <div className="space-y-1">
            {NAV_ITEMS.map(navItem)}
          </div>
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Organize</div>
            <div className="space-y-1">
              {ORG_ITEMS.map(navItem)}
            </div>
          </div>
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tools</div>
            <div className="space-y-1">
              {TOOLS_ITEMS.map(navItem)}
            </div>
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <button onClick={() => { setView('settings'); setSidebarOpen(false); }} className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white">
              {getInitials(settings.display_name)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{settings.display_name}</div>
              <div className="text-xs text-gray-400">v1.0.0</div>
            </div>
            <Settings className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 md:hidden">
          <button className="btn-icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            <span className="font-bold text-gray-900 dark:text-white">Mazrielle OS</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="animate-fade-in" key={view}>
            {view === 'dashboard' && <Dashboard onNavigate={target => setView(target as ViewId)} settings={settings} />}
            {view === 'vault' && <Vault />}
            {view === 'notes' && <Notes />}
            {view === 'tasks' && <Tasks />}
            {view === 'calendar' && <CalendarView />}
            {view === 'income' && <Income />}
            {view === 'folders' && <Folders />}
            {view === 'favorites' && <Favorites />}
            {view === 'generator' && <PasswordGenerator />}
            {view === 'activity' && <ActivityLog />}
            {view === 'settings' && <SettingsView settings={settings} update={update} accountEmail={email} onSignOut={email ? () => void signOut() : undefined} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
