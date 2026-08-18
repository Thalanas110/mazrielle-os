# Settings Query and Brand Design

## Goal

Prevent PGlite query results from being treated as arrays, which currently makes `getSettings()` dereference an undefined row. Replace the copied product label `KeepR` with `Mazrielle OS` in user-facing UI and new-install seed content.

## Scope

- Read PGlite query rows through the result object's `rows` property across all read APIs in `src/lib/api.ts`.
- Preserve the missing-settings fallback to `DEFAULT_SETTINGS`.
- Add regression coverage for populated and empty settings query results.
- Replace user-facing and seed-template `KeepR` strings with `Mazrielle OS`.
- Preserve the existing `idb://keepr-db` storage identifier so existing local data remains available.
- Do not rewrite existing user-created records that may contain the old name.

## Approach

Use a small typed helper for extracting rows from PGlite query results, then route all API read mappings through it. This fixes the immediate settings crash and prevents the same result-shape bug from affecting credentials, notes, tasks, income, folders, and activity data. The storage identifier remains an implementation compatibility detail rather than part of the displayed product identity.

## Error Handling

When the settings query returns no rows, `getSettings()` returns the existing defaults. Query failures remain rejected so the application does not silently hide database initialization or storage errors.

## Testing

Add focused regression tests for the row extraction and settings parsing behavior, then run the focused test suite plus TypeScript checking, linting, and production build verification. Scan source and document strings to ensure no user-facing `KeepR` references remain.
