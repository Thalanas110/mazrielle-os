# Seven-Column Kanban Board

## Context

The Tasks view currently has three status columns: To Do, In Progress, and Completed. The actual Kanban workflow has seven categories with a distinct cover-image slot per category:

1. Future Plans
2. Current Sprint
3. To Do
4. Doing
5. On Hold
6. Blocked
7. Done

The board should feel like a real Kanban board, with readable fixed-width columns and horizontal scrolling when the full board does not fit. Existing encrypted task records may still contain the previous three status values and must remain visible.

## Goals

- Replace the three-column task board with the seven categories in the exact order above.
- Add one configurable local cover-image slot for each category.
- Support PNG, JPG/JPEG, WebP, SVG, and other browser-supported local assets through `public/task-covers/`.
- Normalize legacy task statuses at the API boundary:
  - `todo` → `to_do`
  - `in_progress` → `doing`
  - `completed` → `done`
- Default newly created tasks to To Do.
- Keep task cards, editing, deletion, due dates, tags, priorities, and encrypted storage intact.
- Keep the board usable without any cover files by showing status-colored fallbacks.

## Non-goals

- No drag-and-drop implementation in this change.
- No upload UI or cover-image manager.
- No remote image fetching.
- No database migration for task payloads; task payloads are encrypted and legacy values are normalized when read.
- No change to task priority or due-date semantics.

## Status model and compatibility

Change the application `TaskStatus` union to:

```ts
type TaskStatus = 'future_plans' | 'current_sprint' | 'to_do' | 'doing' | 'on_hold' | 'blocked' | 'done';
```

Add a shared normalization helper at the API boundary. It accepts the seven current IDs, the three legacy IDs, or an unknown runtime string and returns a current `TaskStatus`. Legacy values map as specified above; an unknown or missing value falls back to `to_do` so a malformed record remains visible instead of disappearing from the board.

`getTasks()` normalizes each returned task before applying an optional status filter and before returning data to the views. New tasks created through `createTask()` use `to_do` when no status is supplied. Status updates write only current IDs. This keeps existing local and synced encrypted records readable without mutating them simply because they were loaded.

## Board layout

The Tasks board uses a horizontally scrollable flex row. Each column has a fixed readable width and does not shrink, so seven columns remain visually consistent. The page retains its existing max-width container; the board itself owns horizontal overflow and spacing.

Each column contains:

1. A cover region using the configured local image with `object-cover`.
2. A status-colored fallback when the image path is empty or fails to load.
3. The category label and task count.
4. The existing task list and empty state.

Covers are decorative and use empty alt text. Missing files must not render a broken-image icon or prevent task interaction.

## Cover slots

Extend the existing `public/task-covers/` guide and centralized cover map with these default paths:

- `/task-covers/future-plans.png`
- `/task-covers/current-sprint.png`
- `/task-covers/to-do.png`
- `/task-covers/doing.png`
- `/task-covers/on-hold.png`
- `/task-covers/blocked.png`
- `/task-covers/done.png`

Users can replace any file with another supported format by changing that one map entry. No cover is required for the board to render.

## Status interactions

The card checkbox remains a completion shortcut rather than a status-cycle control:

- Any status other than `done` moves the task to `done`.
- A `done` task moves back to `to_do`.

The task form status selector exposes all seven categories and is the explicit way to move a task to Future Plans, Current Sprint, Doing, On Hold, or Blocked.

Update Dashboard's completed checks to use `done`, and update Calendar's quick-add default to `to_do`. Overdue and task-count behavior continues to treat every status except `done` as active.

## Accessibility and resilience

- Cover images are decorative only and have empty alt text.
- Horizontal scrolling must remain keyboard- and touch-usable through normal browser overflow behavior.
- Existing task buttons remain keyboard accessible.
- A failed image only hides that image; the fallback cover and category controls remain visible.

## Verification

- Add unit tests for current status recognition and legacy normalization.
- Run typecheck, lint, the full test suite, and the production build.
- Confirm legacy task values appear under To Do, Doing, and Done after loading.
- Confirm new tasks default to To Do and Calendar quick-add uses To Do.
- Confirm all seven columns render in order and each has a distinct configurable cover path.
- Confirm the board scrolls horizontally without shrinking columns.
- Confirm missing cover files show fallbacks without broken-image UI.
- Confirm checkbox completion, status selection, editing, deletion, empty states, and Dashboard counts remain correct.
