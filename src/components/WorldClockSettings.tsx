import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, GripVertical, Plus, Search, Trash2 } from 'lucide-react';
import {
  getWorldClockOptions,
  isSupportedTimeZone,
  reorderWorldClocks,
  type WorldClockOption,
} from '@/lib/worldClocks';

interface WorldClockSettingsProps {
  timeZones: string[];
  onChange: (timeZones: string[]) => Promise<void>;
  onSaved: () => void;
}

interface DragState {
  id: string;
  order: string[];
}

export default function WorldClockSettings({ timeZones, onChange, onSaved }: WorldClockSettingsProps) {
  const [query, setQuery] = useState('');
  const [draftIds, setDraftIds] = useState<string[]>(() => normalizeIds(timeZones));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [catalogNow, setCatalogNow] = useState(() => new Date());
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    setDraftIds(normalizeIds(timeZones));
  }, [timeZones]);

  useEffect(() => {
    const interval = setInterval(() => setCatalogNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const options = useMemo(() => getWorldClockOptions(catalogNow), [catalogNow]);
  const optionsById = useMemo(() => new Map(options.map(option => [option.timeZone, option])), [options]);
  const selectedOptions = draftIds
    .map(timeZone => optionsById.get(timeZone))
    .filter((option): option is WorldClockOption => Boolean(option));
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter(option => !normalizedQuery || option.searchText.includes(normalizedQuery));

  const commit = async (nextIds: string[]) => {
    const next = normalizeIds(nextIds);
    setDraftIds(next);
    setSaveError(null);
    setSaving(true);
    try {
      await onChange(next);
      onSaved();
    } catch {
      setSaveError('Could not save your world clocks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addClock = (timeZone: string) => {
    if (draftIds.includes(timeZone)) return;
    void commit([...draftIds, timeZone]);
  };

  const removeClock = (timeZone: string) => {
    void commit(draftIds.filter(id => id !== timeZone));
  };

  const moveBy = (index: number, delta: number) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= draftIds.length) return;
    const next = [...draftIds];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    void commit(next);
  };

  const beginDrag = (timeZone: string, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: timeZone, order: [...draftIds] };
    setDraggingId(timeZone);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-world-clock-id]');
    const overId = row?.dataset.worldClockId;
    if (!overId) return;

    const next = reorderWorldClocks(drag.order, drag.id, overId);
    if (next.join('|') === drag.order.join('|')) return;
    drag.order = next;
    setDraftIds(next);
  };

  const finishDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDraggingId(null);
    void commit(drag.order);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">World Clocks</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choose the cities and time zones that appear on your Dashboard.
        </p>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {saveError}
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Selected clocks</h3>
          <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{selectedOptions.length}</span>
        </div>

        {selectedOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">No clocks selected yet.</p>
            <p className="mt-1 text-xs text-gray-400">Search below to add a city or time zone.</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {selectedOptions.map((option, index) => (
              <li
                key={option.timeZone}
                data-world-clock-id={option.timeZone}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${draggingId === option.timeZone ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-800'}`}
              >
                <button
                  type="button"
                  aria-label={`Drag ${option.city}`}
                  className="btn-icon touch-none"
                  onPointerDown={event => beginDrag(option.timeZone, event)}
                  onPointerMove={moveDrag}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                  disabled={saving}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{option.city}</div>
                  <div className="truncate text-xs text-gray-400">{option.region} · {option.timeZone} · {option.utcOffset}</div>
                </div>
                <button
                  type="button"
                  aria-label={`Move ${option.city} up`}
                  className="btn-icon"
                  disabled={saving || index === 0}
                  onClick={() => moveBy(index, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${option.city} down`}
                  className="btn-icon"
                  disabled={saving || index === selectedOptions.length - 1}
                  onClick={() => moveBy(index, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${option.city}`}
                  className="btn-icon"
                  disabled={saving}
                  onClick={() => removeClock(option.timeZone)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <label htmlFor="world-clock-search" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Add a city or time zone
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="world-clock-search"
            className="input pl-9"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search cities or IANA zones"
            autoComplete="off"
          />
        </div>

        <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
          {filteredOptions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No matching time zones.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredOptions.map(option => {
                const selected = draftIds.includes(option.timeZone);
                return (
                  <div key={option.timeZone} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{option.city}</div>
                      <div className="truncate text-xs text-gray-400">{option.region} · {option.timeZone} · {option.utcOffset}</div>
                    </div>
                    <button
                      type="button"
                      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${selected ? 'cursor-default text-gray-400 dark:text-gray-600' : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10'}`}
                      onClick={() => addClock(option.timeZone)}
                      disabled={selected || saving}
                    >
                      {selected ? <><Check className="h-3.5 w-3.5" /> Selected</> : <><Plus className="h-3.5 w-3.5" /> Add</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function normalizeIds(timeZones: readonly string[]): string[] {
  return [...new Set(timeZones.filter(isSupportedTimeZone))];
}
