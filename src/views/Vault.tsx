import { useEffect, useState } from 'react';
import { KeyRound, Plus, Search, Eye, EyeOff, Copy, Star, Trash2, Edit3, Check } from 'lucide-react';
import { getCredentials, createCredential, updateCredential, deleteCredential, getFolders } from '@/lib/api';
import type { Credential, Folder } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/PageHeader';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { getFaviconUrl, passwordStrength } from '@/lib/utils';

export default function Vault() {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState('');
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    const [c, f] = await Promise.all([getCredentials(), getFolders('password')]);
    setCreds(c); setFolders(f);
  };

  useEffect(() => { load(); }, []);

  const filtered = creds.filter(c => {
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()) || c.tags.toLowerCase().includes(search.toLowerCase());
    const matchesFolder = filterFolder === null || c.folder_id === filterFolder;
    return matchesSearch && matchesFolder;
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  const toggleReveal = (id: string) => {
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Vault"
        subtitle="Encrypted local password storage"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add Credential
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search credentials..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setFilterFolder(null)}
            className={`badge shrink-0 ${filterFolder === null ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
          >
            All ({creds.length})
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => setFilterFolder(f.id)}
              className={`badge shrink-0 ${filterFolder === f.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-7 w-7" />}
          title="No credentials found"
          message="Add your first credential to start building your vault."
          action={<button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Credential</button>}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => {
            const isRevealed = revealed.has(c.id);
            return (
              <div key={c.id} className="card group p-4 transition-all hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    {c.website ? (
                      <img src={getFaviconUrl(c.website)} alt="" className="h-6 w-6 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <KeyRound className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                      {c.favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    </div>
                    <p className="truncate text-xs text-gray-400">{c.username}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                  <code className="flex-1 truncate text-xs text-gray-600 dark:text-gray-300">
                    {isRevealed ? c.password : '•'.repeat(Math.min(c.password.length, 20))}
                  </code>
                  <button className="btn-icon h-7 w-7" onClick={() => toggleReveal(c.id)}>
                    {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button className="btn-icon h-7 w-7" onClick={() => handleCopy(c.password, `pass-${c.id}`)}>
                    {copied === `pass-${c.id}` ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <button className="btn-icon h-8 w-8" onClick={() => handleCopy(c.username, `user-${c.id}`)} title="Copy username">
                    {copied === `user-${c.id}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button className="btn-icon h-8 w-8" onClick={() => setEditing(c)} title="Edit">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button className="btn-icon h-8 w-8" onClick={() => setDeleteTarget(c)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex-1" />
                  {c.tags && c.tags.split(',').filter(Boolean).map((tag, i) => (
                    <span key={i} className="badge bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">#{tag.trim()}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 dark:bg-gray-800">
                {c.website ? <img src={getFaviconUrl(c.website)} alt="" className="h-5 w-5 rounded" /> : <KeyRound className="h-4 w-4 text-gray-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{c.title}</span>
                  {c.favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                </div>
                <span className="truncate text-xs text-gray-400">{c.username}</span>
              </div>
              <button className="btn-icon" onClick={() => handleCopy(c.password, `pass-${c.id}`)}>
                {copied === `pass-${c.id}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <button className="btn-icon" onClick={() => setEditing(c)}><Edit3 className="h-4 w-4" /></button>
              <button className="btn-icon" onClick={() => setDeleteTarget(c)}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editing) && (
        <CredentialForm
          credential={editing}
          folders={folders}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={async () => { await load(); setShowAdd(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) { await deleteCredential(deleteTarget.id); await load(); }
        }}
        title="Delete credential?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
      />
    </div>
  );
}

function CredentialForm({ credential, folders, onClose, onSave }: {
  credential: Credential | null;
  folders: Folder[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: credential?.title ?? '',
    username: credential?.username ?? '',
    password: credential?.password ?? '',
    website: credential?.website ?? '',
    notes: credential?.notes ?? '',
    tags: credential?.tags ?? '',
    folder_id: credential?.folder_id ?? null,
    favorite: credential?.favorite ?? false,
  });
  const [showPass, setShowPass] = useState(false);
  const strength = passwordStrength(form.password);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (credential) {
      await updateCredential(credential.id, form);
    } else {
      await createCredential(form);
    }
    onSave();
  };

  return (
    <Modal open onClose={onClose} title={credential ? 'Edit Credential' : 'Add Credential'}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
          <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. GitHub" autoFocus />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Username / Email</label>
            <input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="username@email.com" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Website</label>
            <input className="input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="example.com" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Password</label>
          <div className="relative">
            <input className="input pr-20" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon h-7 w-7" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.password && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div className={`h-full transition-all ${strength.color}`} style={{ width: `${(strength.score / 7) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-400">{strength.label}</span>
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Folder</label>
            <select className="input" value={form.folder_id ?? ''} onChange={e => setForm({ ...form, folder_id: e.target.value || null })}>
              <option value="">No folder</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Tags (comma separated)</label>
            <input className="input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="work, email" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
          <textarea className="input min-h-[80px] resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.favorite} onChange={e => setForm({ ...form, favorite: e.target.checked })} className="rounded" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Mark as favorite</span>
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>{credential ? 'Save Changes' : 'Add Credential'}</button>
      </div>
    </Modal>
  );
}
