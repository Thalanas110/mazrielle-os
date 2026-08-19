# Customizable World Clocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed Dashboard world-clock list with a persisted, searchable, reorderable selection that works with mouse, touch, and keyboard input.

**Architecture:** Keep the ordered IANA time-zone IDs in the existing encrypted `AppSettings` record. Add a pure `worldClocks` utility for catalog discovery, labels, offsets, formatting, validation, normalization, and reordering; add a focused Settings component for editing the list; make Dashboard render the saved order and update times once per second.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, `Intl.DateTimeFormat`, and Node's built-in `node:test` runner.

## Global Constraints

- Use `world_clocks: string[]` in the existing encrypted application-settings value; do not add a database table, backend API, or Supabase migration.
- Use `Intl.supportedValuesOf('timeZone')` when available and include a compatibility fallback catalog.
- Default missing settings to the detected local time zone, with `UTC` as the detector fallback.
- Preserve an explicitly saved empty array; do not automatically restore a clock after the user removes all clocks.
- Persist IDs in user order and keep the Dashboard's existing 12-hour format and one-second refresh cadence.
- Make reordering work through pointer events for mouse and touch, with keyboard move controls as an accessible fallback.
- Follow the repository's existing React/Tailwind patterns and do not add a dependency for drag-and-drop.
- Use test-first development for pure domain and normalization behavior before implementation.
- Before completion, run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.

## File Map

Create:

- `src/lib/worldClocks.ts` - pure time-zone catalog, formatting, validation, normalization, and ordering utilities.
- `src/components/WorldClockSettings.tsx` - responsive Settings editor with search, add/remove, and pointer drag sorting.
- `test/worldClocks.test.ts` - deterministic tests for catalog and world-clock utility behavior.

Modify:

- `src/lib/types.ts` - add `world_clocks` to `AppSettings` and the local-zone default.
- `src/lib/settings.ts` - normalize legacy, malformed, duplicate, and unsupported clock IDs.
- `test/settings.test.ts` - cover defaults, legacy rows, explicit empty values, and normalization.
- `src/views/SettingsView.tsx` - expose the World Clocks tab and render the new editor.
- `src/views/Dashboard.tsx` - remove the hardcoded list and render configured clocks.
- `src/App.tsx` - route the Dashboard empty-state action directly to the World Clocks Settings tab.

No changes are expected in `src/lib/api.ts` or the Supabase migrations: the existing settings read/write path already encrypts and persists arbitrary `AppSettings` fields.

---

### Task 1: Build the time-zone domain utilities

**Files:**
- Create: `src/lib/worldClocks.ts`
- Create: `test/worldClocks.test.ts`

**Interfaces:**
- Produces `WorldClockOption`, `getLocalTimeZone`, `getSupportedTimeZones`, `isSupportedTimeZone`, `getWorldClockOptions`, `getWorldClockOption`, `formatWorldClockTime`, `formatUtcOffset`, `normalizeWorldClocks`, and `reorderWorldClocks` for the settings and Dashboard tasks.
- `WorldClockOption` must have `timeZone: string`, `city: string`, `region: string`, `searchText: string`, `utcOffset: string`, and `common: boolean`.

- [ ] **Step 1: Write failing utility tests**

Create `test/worldClocks.test.ts` with deterministic inputs. The test file should exercise the public contracts rather than implementation details:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatUtcOffset,
  formatWorldClockTime,
  getLocalTimeZone,
  getWorldClockOption,
  getWorldClockOptions,
  isSupportedTimeZone,
  normalizeWorldClocks,
  reorderWorldClocks,
} from '../src/lib/worldClocks.ts';

const newYear = new Date('2024-01-01T00:00:00.000Z');

test('detects a usable local zone or UTC fallback', () => {
  assert.equal(isSupportedTimeZone(getLocalTimeZone()), true);
});

test('formats a clock and offset for a known zone', () => {
  assert.equal(formatWorldClockTime('Asia/Manila', newYear), '08:00 AM');
  assert.equal(formatUtcOffset('Asia/Manila', newYear), 'UTC+08:00');
});

test('rejects unsupported zone IDs without throwing', () => {
  assert.equal(isSupportedTimeZone('Invalid/Zone'), false);
  assert.equal(getWorldClockOption('Invalid/Zone', newYear), undefined);
});

test('puts common cities before the full catalog and exposes searchable labels', () => {
  const options = getWorldClockOptions(newYear);
  assert.equal(options[0].timeZone, 'Asia/Manila');
  assert.equal(options.find(option => option.timeZone === 'America/New_York')?.city, 'New York');
  assert.match(options.find(option => option.timeZone === 'Asia/Manila')?.searchText ?? '', /manila/);
});

test('normalizes IDs while preserving order and explicit emptiness', () => {
  assert.deepEqual(
    normalizeWorldClocks(['Asia/Manila', 'Invalid/Zone', 'Asia/Manila', 'Europe/London']),
    ['Asia/Manila', 'Europe/London'],
  );
  assert.deepEqual(normalizeWorldClocks(undefined, ['Europe/London']), ['Europe/London']);
  assert.deepEqual(normalizeWorldClocks([], ['Europe/London']), []);
});

test('reorders a selected list by moving the active ID before the target ID', () => {
  assert.deepEqual(
    reorderWorldClocks(['Asia/Manila', 'Europe/London', 'Asia/Tokyo'], 'Asia/Tokyo', 'Asia/Manila'),
    ['Asia/Tokyo', 'Asia/Manila', 'Europe/London'],
  );
});
```

- [ ] **Step 2: Run the focused test to confirm it fails**

Run: `node --experimental-strip-types --test test/worldClocks.test.ts`

Expected: FAIL because `src/lib/worldClocks.ts` does not exist yet.

- [ ] **Step 3: Implement the utility module**

Create `src/lib/worldClocks.ts` with these implementation rules:

1. Define a `COMMON_TIME_ZONES` array in this exact starting order so the default search experience is stable: `Asia/Manila`, `America/New_York`, `Europe/London`, `Asia/Tokyo`, `America/Los_Angeles`, `Asia/Singapore`, `Australia/Sydney`, `Europe/Paris`, `Asia/Dubai`, and `Asia/Kolkata`. Each entry includes a friendly city label and region label.
2. Read the full canonical catalog with a type-safe feature check for `Intl.supportedValuesOf`. Always add `UTC` if it is not returned. If enumeration is unavailable, use the checked-in compatibility array containing the common entries plus the canonical fallback IDs supported by the app's target WebViews.
3. Implement `getLocalTimeZone()` with `Intl.DateTimeFormat().resolvedOptions().timeZone`; return `UTC` when that value is missing or fails `isSupportedTimeZone`.
4. Implement `isSupportedTimeZone()` by constructing `new Intl.DateTimeFormat('en-US', { timeZone })` inside a `try/catch`; return `false` for non-string, empty, or invalid values.
5. Convert the final path segment of an IANA ID into `city` by replacing underscores with spaces. Convert preceding segments into `region`. For `UTC` use `UTC` for both display fields. Build `searchText` from the lowercase city, region, and full ID.
6. Sort `getWorldClockOptions()` by the common-city priority first, then city label, then IANA ID. Compute `utcOffset` from the supplied `Date`, not from a cached value, so daylight-saving changes are reflected.
7. Format clock time with `toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: true })` to preserve the existing Dashboard output. Format offsets as `UTC+HH:MM`, `UTC-HH:MM`, or `UTC` using `timeZoneName: 'longOffset'` parts and a normalizer for the runtime's `GMT` prefix.
8. Implement `normalizeWorldClocks(value, fallback)` so non-arrays return a copied fallback array, arrays retain first occurrence order, non-string values are dropped, unsupported IDs are dropped, and `[]` returns `[]`.
9. Implement `reorderWorldClocks(ids, activeId, overId)` as a non-mutating function that returns the original order when either ID is absent or both IDs are equal.

The exported signatures must be:

```ts
export interface WorldClockOption {
  timeZone: string;
  city: string;
  region: string;
  searchText: string;
  utcOffset: string;
  common: boolean;
}

export function getLocalTimeZone(): string;
export function getSupportedTimeZones(): string[];
export function isSupportedTimeZone(timeZone: unknown): boolean;
export function getWorldClockOptions(now?: Date): WorldClockOption[];
export function getWorldClockOption(timeZone: string, now?: Date): WorldClockOption | undefined;
export function formatWorldClockTime(timeZone: string, date?: Date): string;
export function formatUtcOffset(timeZone: string, date?: Date): string;
export function normalizeWorldClocks(value: unknown, fallback?: readonly string[]): string[];
export function reorderWorldClocks(ids: readonly string[], activeId: string, overId: string): string[];
```

- [ ] **Step 4: Run the focused tests to confirm they pass**

Run: `node --experimental-strip-types --test test/worldClocks.test.ts`

Expected: all world-clock tests PASS.

- [ ] **Step 5: Commit the domain utility**

```powershell
git add src/lib/worldClocks.ts test/worldClocks.test.ts
git commit -m "feat: add world clock domain utilities"
```

### Task 2: Persist and normalize the selected clock IDs

**Files:**
- Modify: `src/lib/types.ts:71-96`
- Modify: `src/lib/settings.ts:1-22`
- Modify: `test/settings.test.ts:1-14`

**Interfaces:**
- Consumes `getLocalTimeZone` and `normalizeWorldClocks` from `src/lib/worldClocks.ts`.
- Produces `AppSettings.world_clocks: string[]` for `useSettings`, `SettingsView`, and `Dashboard`.

- [ ] **Step 1: Extend the settings tests first**

Update `test/settings.test.ts` to assert the new contract. Keep the existing default test, and add cases with exact expectations:

```ts
import { getLocalTimeZone } from '../src/lib/worldClocks.ts';

test('defaults a missing clock list to the local time zone', () => {
  assert.deepEqual(settingsFromRow({}).world_clocks, [getLocalTimeZone()]);
});

test('normalizes clock IDs while preserving the saved order', () => {
  assert.deepEqual(
    settingsFromRow({ world_clocks: ['Asia/Tokyo', 'Invalid/Zone', 'Asia/Manila', 'Asia/Tokyo'] }).world_clocks,
    ['Asia/Tokyo', 'Asia/Manila'],
  );
});

test('preserves an explicitly empty clock list', () => {
  assert.deepEqual(settingsFromRow({ world_clocks: [] }).world_clocks, []);
});
```

Update the existing full-row test fixture to include `world_clocks: ['Asia/Tokyo', 'Asia/Tokyo']` and add `world_clocks: ['Asia/Tokyo']` to its expected normalized object. This keeps the test deterministic while also exercising duplicate removal.

- [ ] **Step 2: Run the settings tests to confirm they fail**

Run: `node --experimental-strip-types --test test/settings.test.ts`

Expected: FAIL because `AppSettings` and `settingsFromRow` do not yet expose `world_clocks`.

- [ ] **Step 3: Add the setting and normalization implementation**

In `src/lib/types.ts`, import `getLocalTimeZone` from `./worldClocks.ts`, add `world_clocks: string[]` to `AppSettings`, and add `world_clocks: [getLocalTimeZone()]` to `DEFAULT_SETTINGS`. `worldClocks.ts` must not import `AppSettings`, preventing a circular module dependency.

In `src/lib/settings.ts`, import `normalizeWorldClocks` and return a copied array for both the no-row and row cases. The normalized object must retain the current fields and add:

```ts
world_clocks: normalizeWorldClocks(row.world_clocks, DEFAULT_SETTINGS.world_clocks),
```

For the no-row branch, return `{ ...DEFAULT_SETTINGS, world_clocks: [...DEFAULT_SETTINGS.world_clocks] }` so callers cannot mutate the shared default array. Do not change `src/lib/api.ts`: `getSettings()` already inserts `DEFAULT_SETTINGS`, which now contains the local clock, and `updateSettings()` already merges partial settings into the encrypted record.

- [ ] **Step 4: Run the settings tests to confirm they pass**

Run: `node --experimental-strip-types --test test/settings.test.ts`

Expected: all settings tests PASS, including the existing settings-field normalization test.

- [ ] **Step 5: Commit the settings contract**

```powershell
git add src/lib/types.ts src/lib/settings.ts test/settings.test.ts
git commit -m "feat: persist selected world clocks in settings"
```

### Task 3: Build the responsive World Clocks Settings editor

**Files:**
- Create: `src/components/WorldClockSettings.tsx`
- Modify: `src/views/SettingsView.tsx:1-62,186-224`

**Interfaces:**
- Consumes `WorldClockOption`, `getWorldClockOptions`, `isSupportedTimeZone`, and `reorderWorldClocks` from `src/lib/worldClocks.ts`.
- Consumes `settings.world_clocks` and `update` from `SettingsView`.
- Produces immediate `onChange(nextIds)` calls with an ordered, de-duplicated ID array.

- [ ] **Step 1: Define the component contract and interaction state**

Create `src/components/WorldClockSettings.tsx` with this prop contract:

```tsx
interface WorldClockSettingsProps {
  timeZones: string[];
  onChange: (timeZones: string[]) => Promise<void>;
  onSaved: () => void;
}
```

The component state must include `query`, `draftIds`, and `draggingId`. Initialize `draftIds` from supported `timeZones`, and synchronize it when the parent `timeZones` prop changes. Build the catalog with `getWorldClockOptions(new Date())`; filter available entries by `searchText.includes(query.trim().toLowerCase())` and exclude all `draftIds`.

Implement a single `commit(nextIds)` helper that updates `draftIds`, awaits `onChange(nextIds)`, then calls `onSaved()`. Add and remove actions call it directly. Move-up and move-down controls call a non-mutating helper that swaps adjacent IDs and then call it.

- [ ] **Step 2: Implement pointer drag sorting**

Use a visible handle button on each selected row with `touch-none` and `aria-label`. Track the active ID and latest order in a ref so the pointer-up handler commits the final order exactly once. On pointer move, read the closest selected row from `document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-world-clock-id]')`, call `reorderWorldClocks(draftIds, draggingId, overId)`, and update the draft state only when the order changes. Handle `onPointerUp` and `onPointerCancel` by clearing the active state and committing the latest order. Apply a highlighted border/background to the active row.

The selected row structure must include:

```tsx
<li data-world-clock-id={option.timeZone} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${draggingId === option.timeZone ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-800'}`}>
  <button type="button" aria-label={`Drag ${option.city}`} className="btn-icon touch-none">
    <GripVertical className="h-4 w-4" />
  </button>
  <div className="min-w-0 flex-1">
    <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{option.city}</div>
    <div className="truncate text-xs text-gray-400">{option.region} · {option.timeZone} · {option.utcOffset}</div>
  </div>
  <button type="button" aria-label={`Move ${option.city} up`} className="btn-icon" disabled={index === 0} onClick={() => moveBy(index, -1)}>
    <ChevronUp className="h-4 w-4" />
  </button>
  <button type="button" aria-label={`Move ${option.city} down`} className="btn-icon" disabled={index === draftIds.length - 1} onClick={() => moveBy(index, 1)}>
    <ChevronDown className="h-4 w-4" />
  </button>
  <button type="button" aria-label={`Remove ${option.city}`} className="btn-icon" onClick={() => removeClock(option.timeZone)}>
    <Trash2 className="h-4 w-4" />
  </button>
</li>
```

Use disabled move-up/move-down buttons at list boundaries. Keep all touch targets at least the existing `btn-icon` size, and do not introduce a desktop-only HTML5 `draggable` interaction.

- [ ] **Step 3: Implement the Settings UI states**

Render a selected section with city, region/IANA ID, current offset, drag handle, move controls, and remove action. Render a labeled search input and a scrollable result list with an Add button or Selected badge. Render a useful empty state when `draftIds.length === 0`, but keep the search/add controls visible. Use existing `card`, `input`, `btn-ghost`, `btn-icon`, `badge`, light-mode, dark-mode, and accent-color patterns; use Lucide icons already available in the dependency.

- [ ] **Step 4: Add the World Clocks tab to SettingsView**

In `src/views/SettingsView.tsx`:

1. Import `Clock`, `WorldClockSettings`, and `useEffect`.
2. Export `type SettingsTab = 'account' | 'appearance' | 'security' | 'data' | 'world-clocks' | 'about'`.
3. Add `initialTab?: SettingsTab` to the props and use an effect to select it whenever the prop changes.
4. Add `{ id: 'world-clocks', label: 'World Clocks', icon: Clock }` to the existing tab list.
5. Render `WorldClockSettings` for the new tab with `timeZones={settings.world_clocks}`, `onChange={timeZones => update({ world_clocks: timeZones })}`, and `onSaved={showSaved}`.

The `SettingsView` prop shape must be:

```tsx
export default function SettingsView({ settings, update, accountEmail, onSignOut, initialTab }: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  accountEmail?: string | null;
  onSignOut?: () => void;
  initialTab?: SettingsTab;
})
```

- [ ] **Step 5: Run the typecheck and lint after the Settings editor is wired**

Run: `npm run typecheck` and `npm run lint`

Expected: both commands pass with no new warnings or errors.

- [ ] **Step 6: Commit the Settings editor**

```powershell
git add src/components/WorldClockSettings.tsx src/views/SettingsView.tsx
git commit -m "feat: add world clock settings editor"
```

### Task 4: Render configured clocks and route the empty state

**Files:**
- Modify: `src/views/Dashboard.tsx:1-62,165-179`
- Modify: `src/App.tsx:1-12,114-155`

**Interfaces:**
- Consumes `settings.world_clocks`, `getWorldClockOption`, and `formatWorldClockTime`.
- Consumes the `SettingsTab` type and `initialTab` prop from `SettingsView`.
- Preserves `Dashboard`'s existing `onNavigate: (view: string) => void` contract, using the internal target string `settings-world-clocks` for the direct CTA.

- [ ] **Step 1: Replace Dashboard's fixed clock state**

In `src/views/Dashboard.tsx`:

1. Remove `WORLD_CLOCKS` and replace the string-array state with `const [clockNow, setClockNow] = useState(() => new Date())`.
2. Keep one interval effect that calls `setClockNow(new Date())` every 1000 milliseconds and clears on unmount.
3. Derive `selectedClocks` from `settings.world_clocks.map(timeZone => getWorldClockOption(timeZone, clockNow)).filter((clock): clock is WorldClockOption => Boolean(clock))` so invalid values are omitted without crashing. Use the time-zone ID as the React key.
4. Render each selected option's city label and `formatWorldClockTime(option.timeZone, clockNow)` in the saved order.
5. When `selectedClocks.length === 0`, render an empty World Clocks state with copy explaining that no clocks are selected and a button that calls `onNavigate('settings-world-clocks')`.

The Dashboard clock section should use this shape:

```tsx
<div className="space-y-1 p-2">
  {selectedClocks.length === 0 ? (
    <div className="px-3 py-4 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">No clocks selected</p>
      <button onClick={() => onNavigate('settings-world-clocks')} className="btn-ghost mt-2 text-xs">
        Add a city in Settings
      </button>
    </div>
  ) : selectedClocks.map(clock => (
    <div key={clock.timeZone} className="flex items-center justify-between rounded-lg px-3 py-2">
      <div className="min-w-0">
        <span className="block truncate text-sm text-gray-600 dark:text-gray-400">{clock.city}</span>
        <span className="block text-[10px] text-gray-400">{clock.utcOffset}</span>
      </div>
      <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">
        {formatWorldClockTime(clock.timeZone, clockNow)}
      </span>
    </div>
  ))}
</div>
```

- [ ] **Step 2: Add direct Settings-tab navigation in App**

In `src/App.tsx`:

1. Import `SettingsTab` as a type from `@/views/SettingsView`.
2. Add `const [settingsTab, setSettingsTab] = useState<SettingsTab | undefined>()` in `Workspace`.
3. Add a `navigate(target: string)` callback that sets `settingsTab` to `world-clocks` and `view` to `settings` for `settings-world-clocks`; for every other target, clear `settingsTab` and set the view as the existing `ViewId`.
4. Use `navigate` for Dashboard's `onNavigate` prop.
5. Clear `settingsTab` when a sidebar item or account-settings button opens a normal view.
6. Pass `initialTab={settingsTab}` to `SettingsView`.

The direct navigation callback must be equivalent to:

```tsx
const navigate = (target: string) => {
  if (target === 'settings-world-clocks') {
    setSettingsTab('world-clocks');
    setView('settings');
    return;
  }
  setSettingsTab(undefined);
  setView(target as ViewId);
};
```

- [ ] **Step 3: Run focused tests and the production build**

Run: `npm run test`, `npm run typecheck`, and `npm run build`

Expected: all unit tests pass, TypeScript reports no errors, and Vite produces a successful production build.

- [ ] **Step 4: Commit the Dashboard integration**

```powershell
git add src/views/Dashboard.tsx src/App.tsx
git commit -m "feat: render customizable world clocks"
```

### Task 5: Complete verification and handoff

**Files:**
- Verify: `src/lib/worldClocks.ts`
- Verify: `src/lib/types.ts`
- Verify: `src/lib/settings.ts`
- Verify: `src/components/WorldClockSettings.tsx`
- Verify: `src/views/SettingsView.tsx`
- Verify: `src/views/Dashboard.tsx`
- Verify: `src/App.tsx`
- Verify: `test/worldClocks.test.ts`
- Verify: `test/settings.test.ts`

**Interfaces:**
- Consumes all completed feature tasks.
- Produces a verified, clean working tree with the feature commits listed above.

- [ ] **Step 1: Run every automated check**

Run:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected: all four commands exit with code 0.

- [ ] **Step 2: Inspect the final diff and repository state**

Run:

```powershell
git diff origin/master..HEAD --check
git status --short
git log -5 --oneline
```

Expected: the diff has no whitespace errors, `git status --short` is empty, and the four feature commits are present after the design and plan commits.

- [ ] **Step 3: Perform the responsive manual verification**

Run the app with `npm run dev` and verify in a desktop browser and a mobile-sized viewport:

1. A fresh settings record shows only the detected local zone.
2. Search finds a common city by friendly name and a less-common entry by IANA ID.
3. Add, remove, and remove-all update Settings immediately and survive reload.
4. Mouse drag changes order and the Dashboard reflects that order.
5. Touch drag changes order without scrolling the page from the handle.
6. Keyboard move-up and move-down buttons change order and are disabled at list boundaries.
7. The Dashboard empty state routes directly to the World Clocks Settings tab.
8. Dashboard times continue changing every second for multiple zones.
9. Light theme, dark theme, narrow layout, and long IANA labels remain readable.

- [ ] **Step 4: Commit any verification-only correction**

If verification exposes a concrete defect, fix it with a focused test and implementation change, rerun the affected command, then commit with:

```powershell
git add src/lib/worldClocks.ts src/lib/types.ts src/lib/settings.ts src/components/WorldClockSettings.tsx src/views/SettingsView.tsx src/views/Dashboard.tsx src/App.tsx test/worldClocks.test.ts test/settings.test.ts
git commit -m "fix: harden customizable world clocks"
```

If verification is clean, do not create an empty commit.

## Plan self-review checklist

- Spec coverage: the data model is covered by Tasks 1-2; the catalog and fallback are covered by Task 1; Settings search/add/remove/reorder/empty state are covered by Task 3; Dashboard rendering and direct navigation are covered by Task 4; resilience and acceptance checks are covered by Task 5.
- Completeness scan: every implementation step names its files, interfaces, command, expected result, or concrete code behavior.
- Type consistency: `world_clocks` is consistently `string[]`; `WorldClockOption.timeZone` is the persisted ID; `SettingsTab` includes `world-clocks`; `initialTab` is passed from `App` to `SettingsView`; `Dashboard` keeps its existing string navigation contract.
- Scope: no new persistence system, dependency, backend migration, or unrelated UI refactor is included.
