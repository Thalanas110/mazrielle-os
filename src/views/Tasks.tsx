import { useEffect, useState } from 'react';
import { SquareCheckBig, Plus, Trash2, Edit3, Calendar as CalIcon, Flag } from 'lucide-react';
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/PageHeader';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { formatRelative, isOverdue } from '@/lib/utils';

const COLUMN_COVERS: Record<TaskStatus, string> = {
  future_plans: '/task-covers/future-plans.png',
  current_sprint: '/task-covers/current-sprint.png',
  to_do: '/task-covers/to-do.png',
  doing: '/task-covers/doing.png',
  on_hold: '/task-covers/on-hold.png',
  blocked: '/task-covers/blocked.png',
  done: '/task-covers/done.png',
};

const COLUMNS: { id: TaskStatus; label: string; color: string; coverFallback: string }[] = [
  { id: 'future_plans', label: 'Future Plans', color: 'bg-violet-500', coverFallback: 'bg-violet-500' },
  { id: 'current_sprint', label: 'Current Sprint', color: 'bg-indigo-500', coverFallback: 'bg-indigo-500' },
  { id: 'to_do', label: 'To Do', color: 'bg-gray-400', coverFallback: 'bg-gray-400' },
  { id: 'doing', label: 'Doing', color: 'bg-blue-500', coverFallback: 'bg-blue-500' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-amber-500', coverFallback: 'bg-amber-500' },
  { id: 'blocked', label: 'Blocked', color: 'bg-red-500', coverFallback: 'bg-red-500' },
  { id: 'done', label: 'Done', color: 'bg-green-500', coverFallback: 'bg-green-500' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
};

function TaskColumnCover({ src, fallbackClass }: { src: string; fallbackClass: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`h-24 w-full ${fallbackClass}`}>
      {!imageFailed && src && (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const load = async () => { setTasks(await getTasks()); };
  useEffect(() => { load(); }, []);

  const toggleStatus = async (task: Task) => {
    const next: TaskStatus = task.status === 'done' ? 'to_do' : 'done';
    await updateTask(task.id, { status: next });
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Tasks"
        subtitle="Organize work by status and due date"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add Task
          </button>
        }
      />

      <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-max gap-4">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="flex w-[18rem] shrink-0 flex-col gap-2">
              <div className="card overflow-hidden">
                <TaskColumnCover src={COLUMN_COVERS[col.id]} fallbackClass={col.coverFallback} />
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className={`h-2 w-2 rounded-full ${col.color}`} />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{col.label}</h2>
                  <span className="text-xs text-gray-400">({colTasks.length})</span>
                </div>
              </div>
              <div className="space-y-2">
                {colTasks.length === 0 ? (
                  <div className="card border-dashed py-8 text-center text-xs text-gray-400">No tasks</div>
                ) : colTasks.map(t => {
                  const overdue = t.status !== 'done' && isOverdue(t.due_date);
                  return (
                    <div key={t.id} className="card group p-3 transition-all hover:shadow-md">
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => toggleStatus(t)}
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all ${t.status === 'done' ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-blue-500 dark:border-gray-600'}`}
                        >
                          {t.status === 'done' && <SquareCheckBig className="h-3 w-3 text-white" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-sm font-medium ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{t.title}</h3>
                          {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{t.description}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className={`badge ${PRIORITY_COLORS[t.priority]}`}>
                              <Flag className="mr-1 h-2.5 w-2.5" />{t.priority}
                            </span>
                            {t.due_date && (
                              <span className={`badge ${overdue ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                <CalIcon className="mr-1 h-2.5 w-2.5" />{formatRelative(t.due_date)}
                              </span>
                            )}
                            {t.tags.split(',').filter(Boolean).map((tag, i) => (
                              <span key={i} className="badge bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">#{tag.trim()}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button className="btn-icon h-7 w-7" onClick={() => setEditing(t)}><Edit3 className="h-3.5 w-3.5" /></button>
                          <button className="btn-icon h-7 w-7" onClick={() => setDeleteTarget(t)}><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            );
          })}
        </div>
      </div>

      {tasks.length === 0 && (
        <EmptyState
          icon={<SquareCheckBig className="h-7 w-7" />}
          title="No tasks yet"
          message="Add your first task to start organizing your work."
          action={<button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Task</button>}
        />
      )}

      {(showAdd || editing) && (
        <TaskForm
          task={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={async () => { await load(); setShowAdd(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) { await deleteTask(deleteTarget.id); await load(); }
        }}
        title="Delete task?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
      />
    </div>
  );
}

function TaskForm({ task, onClose, onSave }: {
  task: Task | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'to_do' as TaskStatus,
    priority: task?.priority ?? 'medium' as TaskPriority,
    due_date: task?.due_date ?? '',
    tags: task?.tags ?? '',
  });

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const data = { ...form, due_date: form.due_date || null };
    if (task) {
      await updateTask(task.id, data);
    } else {
      await createTask(data);
    }
    onSave();
  };

  return (
    <Modal open onClose={onClose} title={task ? 'Edit Task' : 'Add Task'}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
          <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title..." autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
          <textarea className="input min-h-[80px] resize-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add details..." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}>
              {COLUMNS.map(column => (
                <option key={column.id} value={column.id}>{column.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
            <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Due Date</label>
            <input type="date" className="input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Tags</label>
            <input className="input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="work, urgent" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>{task ? 'Save Changes' : 'Add Task'}</button>
      </div>
    </Modal>
  );
}
