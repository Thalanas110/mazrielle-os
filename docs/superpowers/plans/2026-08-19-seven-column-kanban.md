# Seven-Column Kanban Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-status task board with a horizontally scrollable seven-column Kanban board while preserving and normalizing existing encrypted task data.

**Architecture:** Introduce a shared task-status normalization helper at the API boundary, so legacy payload values remain visible as current statuses without a storage migration. Update all task status consumers to use the seven current IDs, then render fixed-width columns with one configurable local cover slot per category and the existing task-card interactions.

**Tech Stack:** React 18, TypeScript, Vite public assets, Tailwind CSS, Node test runner, ESLint.

## Global Constraints

- Replace the three-column task board with the seven categories in the exact order above.
- Normalize legacy task statuses at the API boundary: `todo` → `to_do`, `in_progress` → `doing`, `completed` → `done`.
- Default newly created tasks to To Do.
- No drag-and-drop implementation in this change.
- No upload UI or cover-image manager.
- No remote image fetching.
- No database migration for task payloads; task payloads are encrypted and legacy values are normalized when read.
- Covers are decorative only and use empty alt text.
- Missing cover files show status-colored fallbacks without broken-image UI.
- The card checkbox moves any non-`done` task to `done`; a `done` task moves back to `to_do`.

---

### Task 1: Add and test the seven-status model

**Files:**
- Modify: `src/lib/types.ts:4`
- Create: `src/lib/taskStatuses.ts`
- Create: `test/taskStatuses.test.ts`

**Interfaces:**
- Consumes: Runtime task status strings from encrypted task payloads.
- Produces: `TaskStatus`, `TASK_STATUS_ORDER`, and `normalizeTaskStatus(status)` for the API and views.

- [ ] **Step 1: Write the failing normalization tests**

Create `test/taskStatuses.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTaskStatus, TASK_STATUS_ORDER } from '../src/lib/taskStatuses.ts';

test('exposes the seven Kanban statuses in board order', () => {
  assert.deepEqual(TASK_STATUS_ORDER, [
    'future_plans',
    'current_sprint',
    'to_do',
    'doing',
    'on_hold',
    'blocked',
    'done',
  ]);
});

test('keeps every current status unchanged', () => {
  for (const status of TASK_STATUS_ORDER) assert.equal(normalizeTaskStatus(status), status);
});

test('maps legacy statuses into the current board', () => {
  assert.equal(normalizeTaskStatus('todo'), 'to_do');
  assert.equal(normalizeTaskStatus('in_progress'), 'doing');
  assert.equal(normalizeTaskStatus('completed'), 'done');
});

test('places missing or unknown statuses in To Do', () => {
  assert.equal(normalizeTaskStatus(undefined), 'to_do');
  assert.equal(normalizeTaskStatus(null), 'to_do');
  assert.equal(normalizeTaskStatus('not-a-status'), 'to_do');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run `node --experimental-strip-types --test test/taskStatuses.test.ts`.

Expected: FAIL because `src/lib/taskStatuses.ts` and the seven-status type do not exist yet.

- [ ] **Step 3: Replace the task status union**

In `src/lib/types.ts`, replace the existing `TaskStatus` line with:

```ts
export type TaskStatus = 'future_plans' | 'current_sprint' | 'to_do' | 'doing' | 'on_hold' | 'blocked' | 'done';
```

- [ ] **Step 4: Implement the normalization helper**

Create `src/lib/taskStatuses.ts`:

```ts
import type { TaskStatus } from './types.ts';

export const TASK_STATUS_ORDER: readonly TaskStatus[] = [
  'future_plans', 'current_sprint', 'to_do', 'doing', 'on_hold', 'blocked', 'done',
];

export function normalizeTaskStatus(status: string | null | undefined): TaskStatus {
  switch (status) {
    case 'future_plans': case 'current_sprint': case 'to_do': case 'doing':
    case 'on_hold': case 'blocked': case 'done': return status;
    case 'todo': return 'to_do';
    case 'in_progress': return 'doing';
    case 'completed': return 'done';
    default: return 'to_do';
  }
}
```

- [ ] **Step 5: Run the focused test to verify it passes**

Run `node --experimental-strip-types --test test/taskStatuses.test.ts`.

Expected: 4 tests pass with 0 failures.

- [ ] **Step 6: Commit the status model**

```powershell
git add -- src/lib/types.ts src/lib/taskStatuses.ts test/taskStatuses.test.ts
git commit -m "feat: add seven-column task status model"
```

Expected: one commit containing the status union, normalizer, and tests.

### Task 2: Normalize API data and update secondary task consumers

**Files:**
- Modify: `src/lib/api.ts:5,122-129`
- Modify: `src/views/CalendarView.tsx:249`
- Modify: `src/views/Dashboard.tsx:29-42`

**Interfaces:**
- Consumes: `TaskStatus` and `normalizeTaskStatus` from Task 1.
- Produces: `getTasks(status?: TaskStatus)` returning current-status tasks, `createTask()` defaulting to `to_do`, and Dashboard/Calendar behavior aligned with `done`.

- [ ] **Step 1: Normalize tasks at the API boundary**

In `src/lib/api.ts`, import `TaskStatus` with the existing types and `normalizeTaskStatus` from `./taskStatuses.ts`. Replace `getTasks()` with:

```ts
export async function getTasks(status?: TaskStatus): Promise<Task[]> {
  const records = await listRecords<Task>('tasks');
  const tasks = records.map(record => ({
    ...withMetadata(record),
    status: normalizeTaskStatus(String(record.value.status ?? '')),
  }));
  return sortBy(
    tasks.filter(task => !status || task.status === status),
    (a, b) => ({ high: 1, medium: 2, low: 3 }[a.priority] - ({ high: 1, medium: 2, low: 3 }[b.priority]) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')),
  );
}
```

- [ ] **Step 2: Default created tasks to To Do**

In `createTask()`, change the value construction to use `status: data.status ?? 'to_do'` while retaining every existing field:

```ts
const value: Task = { id: '', title: data.title ?? '', description: data.description ?? '', status: data.status ?? 'to_do', priority: data.priority ?? 'medium', due_date: data.due_date ?? null, tags: data.tags ?? '', created_at: '', updated_at: '' };
```

- [ ] **Step 3: Update Calendar and Dashboard status IDs**

Change Calendar quick-add from `status: 'todo'` to `status: 'to_do'`.

Change all Dashboard comparisons from `status !== 'completed'` to `status !== 'done'`, including overdue tasks, upcoming tasks, and the Tasks stat count.

- [ ] **Step 4: Run the full existing test suite**

Run `npm test`.

Expected: all existing tests plus the four new status tests pass with 0 failures.

- [ ] **Step 5: Commit API and consumer updates**

```powershell
git add -- src/lib/api.ts src/views/CalendarView.tsx src/views/Dashboard.tsx
git commit -m "feat: normalize task statuses across the app"
```

Expected: one commit containing only API, Calendar, and Dashboard status updates.

### Task 3: Render the seven-column Kanban board and cover slots

**Files:**
- Modify: `src/views/Tasks.tsx:1-210`
- Modify: `public/task-covers/README.md`

**Interfaces:**
- Consumes: `TaskStatus` and normalized tasks from Tasks 1–2.
- Produces: Seven fixed-width horizontally scrollable columns, seven cover paths, all-status form options, and checkbox completion toggles.

- [ ] **Step 1: Replace the cover map and column definitions**

In `src/views/Tasks.tsx`, replace the current three-entry constants with:

```tsx
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
```

- [ ] **Step 2: Change checkbox transitions and done styling**

Replace `toggleStatus()` with:

```ts
const toggleStatus = async (task: Task) => {
  const next: TaskStatus = task.status === 'done' ? 'to_do' : 'done';
  await updateTask(task.id, { status: next });
  await load();
};
```

Replace every Tasks-view comparison to `completed` with `done`, including overdue logic, the checked button, the check icon, and line-through title styling.

- [ ] **Step 3: Make the board horizontally scrollable with fixed-width columns**

Replace the current `grid gap-4 lg:grid-cols-3` wrapper with an outer wrapper using:

```tsx
<div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
  <div className="flex min-w-max gap-4">
```

Close both wrappers after the existing `COLUMNS.map()` output. Change each per-column wrapper from `className="flex flex-col gap-2"` to:

```tsx
className="flex w-[18rem] shrink-0 flex-col gap-2"
```

Keep the existing `TaskColumnCover` component and task-card body unchanged except for the status comparisons from Step 2. The cover must retain `alt=""`, `object-cover`, and its `onError` fallback.

- [ ] **Step 4: Expose all seven statuses in the form**

Replace the three hard-coded status options with:

```tsx
{COLUMNS.map(column => (
  <option key={column.id} value={column.id}>{column.label}</option>
))}
```

Change the form default from `task?.status ?? 'todo'` to:

```ts
task?.status ?? 'to_do' as TaskStatus
```

- [ ] **Step 5: Update the cover-slot guide**

Replace `public/task-covers/README.md` with:

```markdown
# Task column cover slots

Drop one decorative image into this directory for each Kanban category:

- `future-plans.png`
- `current-sprint.png`
- `to-do.png`
- `doing.png`
- `on-hold.png`
- `blocked.png`
- `done.png`

PNG is the default example. JPG, JPEG, WebP, SVG, and other browser-supported local image formats are also supported; if you use a different filename or extension, update the matching path in `src/views/Tasks.tsx` inside `COLUMN_COVERS`.

Images are decorative only. A missing file leaves the category's color fallback visible.
```

- [ ] **Step 6: Run typecheck and lint**

Run `npm run typecheck` and `npm run lint`.

Expected: both commands exit 0 with no errors.

- [ ] **Step 7: Commit the Kanban board UI**

```powershell
git add -- src/views/Tasks.tsx public/task-covers/README.md
git commit -m "feat: render seven-column kanban board"
```

Expected: one commit containing the board UI and seven cover-slot guide.

### Task 4: Verify the complete board behavior

**Files:**
- Verify: `src/lib/taskStatuses.ts`, `src/lib/api.ts`, `src/views/Tasks.tsx`, `src/views/Dashboard.tsx`, `src/views/CalendarView.tsx`, `public/task-covers/README.md`

**Interfaces:**
- Consumes: All commits from Tasks 1–3.
- Produces: Evidence that the seven-column board, legacy compatibility, cover fallbacks, and existing task workflows work together.

- [ ] **Step 1: Run the full verification suite**

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: typecheck, lint, all tests, and the production build exit 0. Existing Vite dependency warnings may be printed by the build without failing it.

- [ ] **Step 2: Verify the status and cover contract from source**

```powershell
rg -n "future_plans|current_sprint|to_do|doing|on_hold|blocked|done" src/lib/types.ts src/lib/taskStatuses.ts src/views/Tasks.tsx src/views/Dashboard.tsx src/views/CalendarView.tsx
rg -n "future-plans|current-sprint|to-do|doing|on-hold|blocked|done" src/views/Tasks.tsx public/task-covers/README.md
```

Expected: all seven IDs appear in the type/helper and Tasks view, legacy mappings appear in the helper, Dashboard/Calendar use `done`/`to_do`, and all seven cover paths are documented and configured.

- [ ] **Step 3: Manually verify the UI**

Run `npm run dev`, open Tasks, and verify:

1. Seven columns appear in the requested order.
2. Columns maintain readable widths and scroll horizontally instead of shrinking.
3. Missing cover files show colored fallbacks with no broken-image icon.
4. Legacy values appear under To Do, Doing, and Done after loading.
5. The checkbox moves active tasks to Done and Done tasks back to To Do.
6. The status selector exposes all seven categories.
7. Dashboard excludes only Done tasks from active counts and lists.
8. Calendar quick-add creates tasks in To Do.
9. Editing, deleting, priorities, due dates, tags, and empty states still work.

- [ ] **Step 4: Confirm the worktree is clean**

```powershell
git diff --check
git status --short
```

Expected: no diff-check output and no unexpected uncommitted files.
