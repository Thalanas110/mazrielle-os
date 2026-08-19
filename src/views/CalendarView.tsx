import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, SquareCheckBig, TrendingUp } from 'lucide-react';
import { getTasks, getIncome, createTask } from '@/lib/api';
import type { Task, Income } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { formatCurrency, getMonthName } from '@/lib/utils';

type ViewMode = 'month' | 'week' | 'year';

export default function CalendarView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [current, setCurrent] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    Promise.all([getTasks(), getIncome()]).then(([t, i]) => { setTasks(t); setIncome(i); });
  }, []);

  const tasksByDate = new Map<string, Task[]>();
  tasks.forEach(t => {
    if (t.due_date) {
      const key = t.due_date.slice(0, 10);
      tasksByDate.set(key, [...(tasksByDate.get(key) ?? []), t]);
    }
  });

  const incomeByDate = new Map<string, Income[]>();
  income.forEach(i => {
    const key = i.date.slice(0, 10);
    incomeByDate.set(key, [...(incomeByDate.get(key) ?? []), i]);
  });

  const navigate = (dir: number) => {
    const d = new Date(current);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setFullYear(d.getFullYear() + dir);
    setCurrent(d);
  };

  const headerLabel = () => {
    if (viewMode === 'month') return `${getMonthName(current.getMonth())} ${current.getFullYear()}`;
    if (viewMode === 'year') return `${current.getFullYear()}`;
    const start = new Date(current);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const renderMonth = () => {
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div>
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="min-h-[80px] border-b border-r border-gray-100 dark:border-gray-800/50" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDate.get(dateStr) ?? [];
            const dayIncome = incomeByDate.get(dateStr) ?? [];
            const isToday = today.getTime() === new Date(year, month, day).getTime();
            return (
              <div
                key={i}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-h-[80px] cursor-pointer border-b border-r border-gray-100 p-1.5 transition-colors hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/30 ${isToday ? 'bg-blue-50 dark:bg-blue-500/5' : ''}`}
              >
                <div className={`mb-1 text-xs font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>{day}</div>
                {dayTasks.slice(0, 2).map(t => (
                  <div key={t.id} className="mb-0.5 truncate rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 2 && <div className="text-[10px] text-gray-400">+{dayTasks.length - 2} more</div>}
                {dayIncome.map(inc => (
                  <div key={inc.id} className="mb-0.5 truncate rounded bg-green-100 px-1 py-0.5 text-[10px] text-green-700 dark:bg-green-500/15 dark:text-green-400">
                    {formatCurrency(inc.amount, inc.currency)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const start = new Date(current);
    start.setDate(start.getDate() - start.getDay());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().slice(0, 10);
          const dayTasks = tasksByDate.get(dateStr) ?? [];
          const dayIncome = incomeByDate.get(dateStr) ?? [];
          const isToday = today.getTime() === d.getTime();
          return (
            <div key={i} className={`card min-h-[200px] p-3 ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {d.toLocaleDateString('en-US', { weekday: 'short' })} {d.getDate()}
              </div>
              <div className="space-y-1">
                {dayTasks.map(t => (
                  <div key={t.id} className="rounded bg-blue-100 px-1.5 py-1 text-[10px] text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                    {t.title}
                  </div>
                ))}
                {dayIncome.map(inc => (
                  <div key={inc.id} className="rounded bg-green-100 px-1.5 py-1 text-[10px] text-green-700 dark:bg-green-500/15 dark:text-green-400">
                    {formatCurrency(inc.amount, inc.currency)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderYear = () => {
    const year = current.getFullYear();
    const today = new Date();
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, m) => {
          const monthTasks = tasks.filter(t => {
            if (!t.due_date) return false;
            const d = new Date(t.due_date);
            return d.getMonth() === m && d.getFullYear() === year;
          });
          const monthIncome = income.filter(i => {
            const d = new Date(i.date);
            return d.getMonth() === m && d.getFullYear() === year;
          });
          const isCurrent = today.getMonth() === m && today.getFullYear() === year;
          return (
            <div
              key={m}
              onClick={() => { setCurrent(new Date(year, m, 1)); setViewMode('month'); }}
              className={`card cursor-pointer p-3 transition-all hover:shadow-md ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{getMonthName(m)}</div>
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <SquareCheckBig className="h-3 w-3" /> {monthTasks.length} tasks
                </div>
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <TrendingUp className="h-3 w-3" /> {monthIncome.length} entries
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Calendar"
        subtitle="View tasks and income across time"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add Task
          </button>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn-icon" onClick={() => navigate(-1)}><ChevronLeft className="h-5 w-5" /></button>
          <button className="btn-icon" onClick={() => navigate(1)}><ChevronRight className="h-5 w-5" /></button>
          <h2 className="ml-1 text-lg font-semibold text-gray-900 dark:text-white">{headerLabel()}</h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(['week', 'month', 'year'] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${viewMode === m ? 'bg-white text-gray-900 shadow-sm dark:bg-[#1a1a1e] dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {viewMode === 'month' && renderMonth()}
        {viewMode === 'week' && renderWeek()}
        {viewMode === 'year' && renderYear()}
      </div>

      {showAdd && (
        <QuickAddTask
          defaultDate={selectedDate}
          onClose={() => setShowAdd(false)}
          onSave={async () => {
            const t = await getTasks();
            setTasks(t);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function QuickAddTask({ defaultDate, onClose, onSave }: {
  defaultDate: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));

  const handleSave = async () => {
    if (!title.trim()) return;
    await createTask({ title, due_date: dueDate, status: 'to_do', priority: 'medium', description: '', tags: '' });
    onSave();
  };

  return (
    <Modal open onClose={onClose} title="Add Task">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..." autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Due Date</label>
          <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>Add Task</button>
      </div>
    </Modal>
  );
}
