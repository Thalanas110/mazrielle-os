import { useEffect, useState } from 'react';
import { StickyNote, Plus, Search, Star, Trash2, Edit3, Eye } from 'lucide-react';
import { getNotes, createNote, updateNote, deleteNote, getFolders } from '@/lib/api';
import type { Note, Folder } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/PageHeader';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { formatDate } from '@/lib/utils';

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState('');
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const load = async () => {
    const [n, f] = await Promise.all([getNotes(), getFolders('note')]);
    setNotes(n); setFolders(f);
  };

  useEffect(() => { load(); }, []);

  const filtered = notes.filter(n => {
    const matchesSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    const matchesFolder = filterFolder === null || n.folder_id === filterFolder;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Notes"
        subtitle="Private markdown-style notepad"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => { setShowAdd(true); setPreviewMode(false); }}>
            <Plus className="h-4 w-4" /> New Note
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setFilterFolder(null)}
            className={`badge shrink-0 ${filterFolder === null ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
          >
            All ({notes.length})
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

      {filtered.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-7 w-7" />}
          title="No notes found"
          message="Create your first note to start jotting down ideas."
          action={<button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> New Note</button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(n => (
            <div key={n.id} className="card group flex flex-col p-4 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  <StickyNote className="h-4 w-4" />
                </div>
                {n.favorite && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
              </div>
              <h3 className="mt-3 truncate text-sm font-semibold text-gray-900 dark:text-white">{n.title}</h3>
              <p className="mt-1 line-clamp-4 flex-1 text-xs text-gray-500 dark:text-gray-400">{n.content.replace(/[#*]/g, '')}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{formatDate(n.updated_at)}</span>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="btn-icon h-7 w-7" onClick={() => { setEditing(n); setPreviewMode(false); }}><Edit3 className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon h-7 w-7" onClick={() => setDeleteTarget(n)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editing) && (
        <NoteForm
          note={editing}
          folders={folders}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={async () => { await load(); setShowAdd(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) { await deleteNote(deleteTarget.id); await load(); }
        }}
        title="Delete note?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
      />
    </div>
  );
}

function NoteForm({ note, folders, previewMode, setPreviewMode, onClose, onSave }: {
  note: Note | null;
  folders: Folder[];
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: note?.title ?? '',
    content: note?.content ?? '',
    folder_id: note?.folder_id ?? null,
    favorite: note?.favorite ?? false,
  });

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (note) {
      await updateNote(note.id, form);
    } else {
      await createNote(form);
    }
    onSave();
  };

  return (
    <Modal open onClose={onClose} title={note ? 'Edit Note' : 'New Note'} size="lg">
      <div className="space-y-4">
        <input className="input text-base font-semibold" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Note title..." autoFocus />
        <div className="flex items-center gap-2">
          <button
            className={`btn-ghost ${!previewMode ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            onClick={() => setPreviewMode(false)}
          >
            <Edit3 className="h-4 w-4" /> Write
          </button>
          <button
            className={`btn-ghost ${previewMode ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            onClick={() => setPreviewMode(true)}
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
        </div>
        {previewMode ? (
          <div className="min-h-[200px] whitespace-pre-wrap rounded-lg border border-gray-200 p-4 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">{form.content || <span className="text-gray-400">Nothing to preview</span>}</div>
        ) : (
          <textarea
            className="input min-h-[200px] resize-none font-mono text-sm"
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="# Start writing in markdown..."
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Folder</label>
            <select className="input" value={form.folder_id ?? ''} onChange={e => setForm({ ...form, folder_id: e.target.value || null })}>
              <option value="">No folder</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" checked={form.favorite} onChange={e => setForm({ ...form, favorite: e.target.checked })} className="rounded" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Mark as favorite</span>
          </label>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>{note ? 'Save Changes' : 'Create Note'}</button>
      </div>
    </Modal>
  );
}
