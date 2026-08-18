import { useEffect, useState } from 'react';
import { TrendingUp, Plus, Trash2, Edit3, Search } from 'lucide-react';
import { getIncome, createIncome, updateIncome, deleteIncome } from '@/lib/api';
import type { Income as IncomeType } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/PageHeader';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function Income() {
  const [entries, setEntries] = useState<IncomeType[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<IncomeType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IncomeType | null>(null);

  const load = async () => { setEntries(await getIncome()); };
  useEffect(() => { load(); }, []);

  const filtered = entries.filter(e =>
    !search || e.source.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const monthEntries = entries.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = monthEntries.reduce((s, e) => s + e.amount, 0);
  const allTimeTotal = entries.reduce((s, e) => s + e.amount, 0);

  const categories = new Map<string, number>();
  entries.forEach(e => {
    categories.set(e.category, (categories.get(e.category) ?? 0) + e.amount);
  });
  const sortedCategories = [...categories.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = sortedCategories[0]?.[1] ?? 1;

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthEntries = entries.filter(e => {
      const ed = new Date(e.date);
      return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
    });
    return {
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      total: monthEntries.reduce((s, e) => s + e.amount, 0),
    };
  });
  const maxMonth = Math.max(...last6Months.map(m => m.total), 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Income"
        subtitle="Track earnings in one local view"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add Income
          </button>
        }
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">This Month</div>
          <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(monthTotal, 'PHP')}</div>
          <div className="mt-1 text-xs text-gray-400">{monthEntries.length} entries</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">All-Time</div>
          <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(allTimeTotal, 'PHP')}</div>
          <div className="mt-1 text-xs text-gray-400">{entries.length} entries</div>
        </div>
        <div className="card p-4 col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg per Entry</div>
          <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(entries.length > 0 ? allTimeTotal / entries.length : 0, 'PHP')}
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {/* Chart */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Income — Last 6 Months</h2>
          <div className="flex items-end justify-between gap-2" style={{ height: '160px' }}>
            {last6Months.map((m, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all hover:opacity-80"
                    style={{ height: `${(m.total / maxMonth) * 100}%`, minHeight: m.total > 0 ? '8px' : '2px' }}
                    title={formatCurrency(m.total, 'PHP')}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">By Category</h2>
          {sortedCategories.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No data yet</div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map(([cat, amount]) => (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-600 dark:text-gray-400">{cat || 'Uncategorized'}</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(amount, 'PHP')}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(amount / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search income..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-7 w-7" />}
          title="No income entries"
          message="Add your first income entry to start tracking earnings."
          action={<button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Income</button>}
        />
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map(e => (
            <div key={e.id} className="group flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{e.source}</div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{formatDate(e.date)}</span>
                  {e.category && <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{e.category}</span>}
                </div>
              </div>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(e.amount, e.currency)}</span>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="btn-icon h-8 w-8" onClick={() => setEditing(e)}><Edit3 className="h-4 w-4" /></button>
                <button className="btn-icon h-8 w-8" onClick={() => setDeleteTarget(e)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editing) && (
        <IncomeForm
          entry={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={async () => { await load(); setShowAdd(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) { await deleteIncome(deleteTarget.id); await load(); }
        }}
        title="Delete income entry?"
        message={`Are you sure you want to delete "${deleteTarget?.source}"?`}
      />
    </div>
  );
}

function IncomeForm({ entry, onClose, onSave }: {
  entry: IncomeType | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    source: entry?.source ?? '',
    amount: entry?.amount ?? 0,
    currency: entry?.currency ?? 'PHP',
    category: entry?.category ?? '',
    date: entry?.date ?? new Date().toISOString().slice(0, 10),
    notes: entry?.notes ?? '',
  });

  const handleSave = async () => {
    if (!form.source.trim()) return;
    if (entry) {
      await updateIncome(entry.id, form);
    } else {
      await createIncome(form);
    }
    onSave();
  };

  return (
    <Modal open onClose={onClose} title={entry ? 'Edit Income' : 'Add Income'}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Source</label>
          <input className="input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. Freelance Project" autoFocus />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Amount</label>
            <input type="number" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Currency</label>
            <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option value="PHP">PHP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
            <input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Freelance, Salary..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
          <textarea className="input min-h-[60px] resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>{entry ? 'Save Changes' : 'Add Income'}</button>
      </div>
    </Modal>
  );
}
