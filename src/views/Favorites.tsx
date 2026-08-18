import { useEffect, useState } from 'react';
import { Star, KeyRound, StickyNote, Folder as FolderIcon } from 'lucide-react';
import { getCredentials, getNotes, getFolders, updateCredential, updateNote, updateFolder } from '@/lib/api';
import type { Credential, Note, Folder } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/PageHeader';
import { getFaviconUrl } from '@/lib/utils';

type Tab = 'passwords' | 'notes' | 'folders';

export default function Favorites({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [tab, setTab] = useState<Tab>('passwords');
  const [creds, setCreds] = useState<Credential[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  const load = async () => {
    const [c, n, f] = await Promise.all([getCredentials(), getNotes(), getFolders()]);
    setCreds(c); setNotes(n); setFolders(f);
  };
  useEffect(() => { load(); }, []);

  const favCreds = creds.filter(c => c.favorite);
  const favNotes = notes.filter(n => n.favorite);
  const favFolders = folders.filter(f => f.favorite);

  const toggleFav = async (type: Tab, id: string) => {
    if (type === 'passwords') {
      const c = creds.find(x => x.id === id);
      if (c) { await updateCredential(id, { favorite: !c.favorite }); await load(); }
    } else if (type === 'notes') {
      const n = notes.find(x => x.id === id);
      if (n) { await updateNote(id, { favorite: !n.favorite }); await load(); }
    } else {
      const f = folders.find(x => x.id === id);
      if (f) { await updateFolder(id, { favorite: !f.favorite }); await load(); }
    }
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'passwords', label: 'Passwords', count: favCreds.length },
    { id: 'notes', label: 'Notes', count: favNotes.length },
    { id: 'folders', label: 'Folders', count: favFolders.length },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Favorites" subtitle="Quickly access your starred items" />

      <div className="mb-4 flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 sm:w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${tab === t.id ? 'bg-white text-gray-900 shadow-sm dark:bg-[#1a1a1e] dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {t.label}
            <span className="badge bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'passwords' && (
        favCreds.length === 0 ? (
          <EmptyState icon={<Star className="h-7 w-7" />} title="No favorite passwords" message="Star credentials to pin them here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favCreds.map(c => (
              <div key={c.id} className="card group p-4 transition-all hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    {c.website ? <img src={getFaviconUrl(c.website)} alt="" className="h-6 w-6 rounded" /> : <KeyRound className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                    <p className="truncate text-xs text-gray-400">{c.username}</p>
                  </div>
                  <button onClick={() => toggleFav('passwords', c.id)} className="btn-icon h-7 w-7">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'notes' && (
        favNotes.length === 0 ? (
          <EmptyState icon={<Star className="h-7 w-7" />} title="No favorite notes" message="Star notes to pin them here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favNotes.map(n => (
              <div key={n.id} className="card group p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <StickyNote className="h-4 w-4" />
                  </div>
                  <button onClick={() => toggleFav('notes', n.id)} className="btn-icon h-7 w-7">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </button>
                </div>
                <h3 className="mt-3 truncate text-sm font-semibold text-gray-900 dark:text-white">{n.title}</h3>
                <p className="mt-1 line-clamp-3 text-xs text-gray-500 dark:text-gray-400">{n.content.replace(/[#*]/g, '')}</p>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'folders' && (
        favFolders.length === 0 ? (
          <EmptyState icon={<Star className="h-7 w-7" />} title="No favorite folders" message="Star folders to pin them here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favFolders.map(f => (
              <div key={f.id} className="card group p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ backgroundColor: f.color + '20' }}>
                      <FolderIcon className="h-5 w-5" style={{ color: f.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{f.name}</h3>
                      <span className="text-xs text-gray-400 capitalize">{f.type}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleFav('folders', f.id)} className="btn-icon h-7 w-7">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
