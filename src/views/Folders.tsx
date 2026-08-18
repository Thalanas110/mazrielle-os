import { useEffect, useState } from 'react';
import { Folder as FolderIcon, Plus, Trash2, Edit3, Star, KeyRound, StickyNote } from 'lucide-react';
import { getFolders, createFolder, updateFolder, deleteFolder, getCredentials, getNotes } from '@/lib/api';
import type { Folder, Credential, Note } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/PageHeader';
import { Modal, ConfirmDialog } from '@/components/Modal';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];

export default function Folders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [creds, setCreds] = useState<Credential[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Folder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null);

  const load = async () => {
    const [f, c, n] = await Promise.all([getFolders(), getCredentials(), getNotes()]);
    setFolders(f); setCreds(c); setNotes(n);
  };
  useEffect(() => { load(); }, []);

  const countItems = (folder: Folder) => {
    if (folder.type === 'password') return creds.filter(c => c.folder_id === folder.id).length;
    return notes.filter(n => n.folder_id === folder.id).length;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Folders"
        subtitle="Organize credentials and notes"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> New Folder
          </button>
        }
      />

      {folders.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="h-7 w-7" />}
          title="No folders yet"
          message="Create folders to organize your passwords and notes."
          action={<button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> New Folder</button>}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map(f => (
            <div key={f.id} className="card group p-4 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ backgroundColor: f.color + '20' }}>
                    {f.type === 'password' ? <KeyRound className="h-5 w-5" style={{ color: f.color }} /> : <StickyNote className="h-5 w-5" style={{ color: f.color }} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{f.name}</h3>
                      {f.favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{f.type} · {countItems(f)} items</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="btn-icon h-7 w-7" onClick={() => setEditing(f)}><Edit3 className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon h-7 w-7" onClick={() => setDeleteTarget(f)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {folders.map(f => (
            <div key={f.id} className="group flex items-center gap-3 p-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ backgroundColor: f.color + '20' }}>
                {f.type === 'password' ? <KeyRound className="h-4 w-4" style={{ color: f.color }} /> : <StickyNote className="h-4 w-4" style={{ color: f.color }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{f.name}</span>
                  {f.favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                </div>
                <span className="text-xs text-gray-400 capitalize">{f.type} · {countItems(f)} items</span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="btn-icon h-8 w-8" onClick={() => setEditing(f)}><Edit3 className="h-4 w-4" /></button>
                <button className="btn-icon h-8 w-8" onClick={() => setDeleteTarget(f)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editing) && (
        <FolderForm
          folder={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={async () => { await load(); setShowAdd(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) { await deleteFolder(deleteTarget.id); await load(); }
        }}
        title="Delete folder?"
        message={`Delete "${deleteTarget?.name}"? Items inside will not be deleted but will lose their folder.`}
      />
    </div>
  );
}

function FolderForm({ folder, onClose, onSave }: {
  folder: Folder | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: folder?.name ?? '',
    type: folder?.type ?? 'password',
    color: folder?.color ?? COLORS[0],
    favorite: folder?.favorite ?? false,
  });

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (folder) {
      await updateFolder(folder.id, { name: form.name, color: form.color, favorite: form.favorite });
    } else {
      await createFolder(form.name, form.type, form.color);
    }
    onSave();
  };

  return (
    <Modal open onClose={onClose} title={folder ? 'Edit Folder' : 'New Folder'}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Folder name..." autoFocus />
        </div>
        {!folder && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setForm({ ...form, type: 'password' })}
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${form.type === 'password' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-800'}`}
              >
                <KeyRound className="h-4 w-4" /> Password
              </button>
              <button
                onClick={() => setForm({ ...form, type: 'note' })}
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${form.type === 'note' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-800'}`}
              >
                <StickyNote className="h-4 w-4" /> Note
              </button>
            </div>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={`h-8 w-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 dark:ring-offset-[#131316]' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.favorite} onChange={e => setForm({ ...form, favorite: e.target.checked })} className="rounded" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Mark as favorite</span>
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>{folder ? 'Save Changes' : 'Create Folder'}</button>
      </div>
    </Modal>
  );
}
