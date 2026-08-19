# Task Column Cover Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable Trello-style decorative cover-image slots above the To Do, In Progress, and Completed task columns.

**Architecture:** Keep the cover paths in a `COLUMN_COVERS` map inside `src/views/Tasks.tsx`, keyed by the existing `TaskStatus` values. Add a tracked `public/task-covers/` directory guide for user-provided local assets, and render each configured path through a small local component with a status-color fallback when the file is absent or fails to load.

**Tech Stack:** React 18, TypeScript, Vite public assets, Tailwind CSS, Node test runner, ESLint.

## Global Constraints

- Add one distinct, configurable image slot above each task column.
- Support user-provided local image files such as PNG, JPG, WebP, and SVG.
- Keep image configuration centralized so a filename or extension can be changed without restructuring the component.
- Preserve the current task interactions, counts, cards, empty states, and responsive three-column layout.
- Avoid broken-image UI when a slot is empty or a file is unavailable.
- No image upload UI or image-management workflow.
- No remote image fetching or third-party image service.
- No persistence of cover-image metadata in the encrypted vault.
- Covers are decorative only and must not introduce redundant screen-reader text.

---

### Task 1: Add the user-facing local cover slots

**Files:**
- Create: `public/task-covers/README.md`

**Interfaces:**
- Consumes: The three existing task statuses in `src/views/Tasks.tsx`.
- Produces: A tracked asset directory and exact filenames users can supply without changing the application structure.

- [ ] **Step 1: Write the slot guide**

Create `public/task-covers/README.md` with this content:

```markdown
# Task column cover slots

Drop one decorative image into this directory for each task category:

- `todo.png`
- `in-progress.png`
- `completed.png`

PNG is the default example. JPG, JPEG, WebP, SVG, and other browser-supported local image formats are also supported; if you use a different filename or extension, update the matching path in `src/views/Tasks.tsx` inside `COLUMN_COVERS`.

Images are decorative only. A missing file leaves the column's color fallback visible.
```

- [ ] **Step 2: Verify the directory is tracked through the guide**

Run:

```powershell
Test-Path -LiteralPath 'public\task-covers\README.md'
```

Expected: `True`.

- [ ] **Step 3: Commit the asset-slot documentation**

Run:

```powershell
git add -- public/task-covers/README.md
git commit -m "docs: document task column cover slots"
```

Expected: one commit containing only `public/task-covers/README.md`.

### Task 2: Render configurable covers above task columns

**Files:**
- Modify: `src/views/Tasks.tsx:1-75`

**Interfaces:**
- Consumes: `TaskStatus`, the existing `COLUMNS` definitions, and the current task-column render loop.
- Produces: `COLUMN_COVERS`, a decorative `TaskColumnCover` renderer, and a cover/header region above each existing task list.

- [ ] **Step 1: Establish the baseline**

Run:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all four commands complete successfully before the UI change.

- [ ] **Step 2: Add the centralized cover paths and fallback classes**

Immediately after the imports in `src/views/Tasks.tsx`, add:

```tsx
const COLUMN_COVERS: Record<TaskStatus, string> = {
  todo: '/task-covers/todo.png',
  in_progress: '/task-covers/in-progress.png',
  completed: '/task-covers/completed.png',
};
```

Extend the existing `COLUMNS` entries with a `coverFallback` property:

```tsx
const COLUMNS: { id: TaskStatus; label: string; color: string; coverFallback: string }[] = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-400', coverFallback: 'bg-gray-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500', coverFallback: 'bg-blue-500' },
  { id: 'completed', label: 'Completed', color: 'bg-green-500', coverFallback: 'bg-green-500' },
];
```

- [ ] **Step 3: Add the graceful-fallback cover component**

Place this component below the `PRIORITY_COLORS` constant and above `Tasks`:

```tsx
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
```

- [ ] **Step 4: Wrap each column heading with its cover**

Replace the current per-column opening and heading block:

```tsx
<div key={col.id} className="flex flex-col">
  <div className="mb-2 flex items-center gap-2 px-1">
    <div className={`h-2 w-2 rounded-full ${col.color}`} />
    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{col.label}</h2>
    <span className="text-xs text-gray-400">({colTasks.length})</span>
  </div>
  <div className="space-y-2">
```

with:

```tsx
<div key={col.id} className="flex flex-col gap-2">
  <div className="card overflow-hidden">
    <TaskColumnCover src={COLUMN_COVERS[col.id]} fallbackClass={col.coverFallback} />
    <div className="flex items-center gap-2 px-3 py-2">
      <div className={`h-2 w-2 rounded-full ${col.color}`} />
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{col.label}</h2>
      <span className="text-xs text-gray-400">({colTasks.length})</span>
    </div>
  </div>
  <div className="space-y-2">
```

The new `card` header wrapper is already closed before the task-list wrapper begins. Leave the existing task-card markup and both existing closing `</div>` tags after the task-list wrapper unchanged.

- [ ] **Step 5: Run automated verification**

Run:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all four commands complete successfully with no TypeScript, lint, test, or production-build errors.

- [ ] **Step 6: Verify the visual and fallback behavior**

Run `npm run dev`, open the Tasks view, and verify:

1. Three cover regions appear above the To Do, In Progress, and Completed headings.
2. With no files in `public/task-covers/`, each region shows its status-color fallback and no broken-image icon.
3. The column headings and counts remain readable below each cover.
4. Existing task controls still toggle, edit, and delete tasks.
5. The layout remains one column on narrow screens and three columns on large screens.
6. Adding a user image at a documented path displays it with `object-cover`.

- [ ] **Step 7: Commit the UI implementation**

Run:

```powershell
git add -- src/views/Tasks.tsx
git commit -m "feat: add task column cover image slots"
```

Expected: one commit containing only the Tasks view implementation.
