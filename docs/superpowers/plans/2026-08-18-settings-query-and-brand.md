# Settings Query and Brand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Fix PGlite result handling so settings and all read APIs consume `result.rows`, then replace the user-facing `KeepR` identity with `Mazrielle OS` without changing the existing local database key.

**Architecture:** Add a small typed `queryRows` boundary that accepts PGlite's `{ rows: T[] }` result and returns the row array. Route every read mapping in `src/lib/api.ts` through that boundary, while keeping `getSettings()`'s empty-result fallback. Branding is a source/template copy update only; `idb://keepr-db` remains unchanged for compatibility.

**Tech Stack:** React 18, TypeScript 5, Vite 5, PGlite, Node's built-in test runner with TypeScript type stripping.

## Global Constraints

- Preserve the existing `idb://keepr-db` storage identifier.
- Return the existing defaults when the settings query has no rows.
- Do not rewrite existing user-created local records.
- Replace user-facing and seed-template `KeepR` strings with `Mazrielle OS`.
- Query failures remain rejected rather than silently swallowed.

---

### Task 1: Add a failing query-row regression test

**Files:**
- Create: `test/queryRows.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the future `queryRows<T>(result: { rows: T[] }): T[]` helper.
- Produces: a runnable `npm test` command proving PGlite result objects are unwrapped through `.rows`.

- [ ] **Step 1: Add the test command**

Add this script to `package.json`:

```json
"test": "node --experimental-strip-types --test test/queryRows.test.ts"
```

- [ ] **Step 2: Write the failing test**

Create `test/queryRows.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { queryRows } from '../src/lib/queryRows.ts';

test('returns rows from a PGlite query result', () => {
  const result = { rows: [{ display_name: 'Ren' }] };

  assert.deepEqual(queryRows(result), [{ display_name: 'Ren' }]);
});

test('returns an empty array when a query has no rows', () => {
  assert.deepEqual(queryRows({ rows: [] }), []);
});
```

- [ ] **Step 3: Run the focused test to verify it fails**

Run: `npm.cmd test -- --test-name-pattern="query result|no rows"`

Expected: FAIL because `src/lib/queryRows.ts` does not exist yet.

### Task 2: Implement the query boundary and fix all read APIs

**Files:**
- Create: `src/lib/queryRows.ts`
- Modify: `src/lib/api.ts:6-20, 35-38, 78-81, 119-122, 160-163, 201-204, 239-242, 264-267`

**Interfaces:**
- Consumes: PGlite `Results<T>` objects returned by `db.query()`.
- Produces: `queryRows<T>(result: { rows: T[] }): T[]` and read APIs that map actual rows.

- [ ] **Step 1: Implement the minimal helper**

Create `src/lib/queryRows.ts`:

```ts
export function queryRows<T>(result: { rows: T[] }): T[] {
  return result.rows;
}
```

- [ ] **Step 2: Run the focused test**

Run: `npm.cmd test -- --test-name-pattern="query result|no rows"`

Expected: PASS.

- [ ] **Step 3: Update `api.ts` to use the helper**

Import `queryRows` from `./queryRows` and replace every cast of a query result to an array with `queryRows(res)`. The settings implementation should become:

```ts
export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const res = await db.query('SELECT * FROM app_settings WHERE id = 1');
  const rows = queryRows(res as { rows: Record<string, unknown>[] });
  if (rows.length === 0) return { ...DEFAULTS };
  const r = rows[0];
  return {
    display_name: String(r.display_name),
    theme: String(r.theme) as AppSettings['theme'],
    accent_color: String(r.accent_color),
    font_size: String(r.font_size) as AppSettings['font_size'],
    auto_lock: Boolean(r.auto_lock),
    clipboard_clear: Boolean(r.clipboard_clear),
    show_website_icons: Boolean(r.show_website_icons),
  };
}
```

For folders, credentials, notes, tasks, income, and activity, use `queryRows(res).map(...)` with the existing parser functions. Do not alter write queries or error propagation.

- [ ] **Step 4: Run the full test and typecheck commands**

Run: `npm.cmd test`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: TypeScript completes with exit code 0.

### Task 3: Replace the product branding

**Files:**
- Modify: `index.html:7`
- Modify: `src/App.tsx:65,98,150`
- Modify: `src/views/ActivityLog.tsx:38`
- Modify: `src/views/SettingsView.tsx:193,199,204`
- Modify: `src/lib/seed.ts:51-53,74-76`

**Interfaces:**
- Consumes: the approved product name `Mazrielle OS`.
- Produces: no user-facing or new-seed `KeepR` references; preserves the database storage key in `src/lib/db.ts`.

- [ ] **Step 1: Replace static UI copy**

Use these exact replacements:

```text
KeepR — Local-First Life OS       -> Mazrielle OS — Local-First Life OS
Loading KeepR...                  -> Loading Mazrielle OS...
KeepR                              -> Mazrielle OS
Track important actions inside KeepR -> Track important actions inside Mazrielle OS
About KeepR                        -> About Mazrielle OS
KeepR is a private...             -> Mazrielle OS is a private...
```

- [ ] **Step 2: Replace new-install seed content**

Change seeded note titles/content, task titles, and `keepr` tags to use `Mazrielle OS`, `mazrielle-os`, or `mazrielle` consistently. Keep unrelated task semantics unchanged.

- [ ] **Step 3: Verify compatibility and source copy**

Run: `rg -n -S "KeepR|keepR|keepr" index.html src`

Expected: only `src/lib/db.ts` contains `idb://keepr-db`; no other old product references remain.

### Task 4: Run final verification

**Files:**
- Verify: `src/lib/api.ts`, `src/lib/queryRows.ts`, `test/queryRows.test.ts`, branding files from Task 3.

- [ ] **Step 1: Run tests**

Run: `npm.cmd test`

Expected: all tests pass without unhandled errors.

- [ ] **Step 2: Run lint**

Run: `npm.cmd run lint`

Expected: ESLint completes with exit code 0.

- [ ] **Step 3: Run typecheck and production build**

Run: `npm.cmd run typecheck`

Expected: exit code 0.

Run: `npm.cmd run build`

Expected: Vite produces a successful production build.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check`

Expected: no whitespace errors. If Git metadata is unavailable, inspect the changed files directly and report that limitation rather than attempting destructive Git commands.
