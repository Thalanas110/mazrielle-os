# Customizable World Clocks

## Overview

Replace the Dashboard's fixed four-city clock list with a user-managed list. Users will manage clocks from a dedicated Settings tab, choose from a searchable catalog of supported IANA time zones, reorder selections with mouse or touch drag-and-drop, and see the ordered list on the Dashboard.

The feature uses Mazrielle OS's existing encrypted application-settings record. It does not add a database table, backend API, or synchronization schema.

## Goals

- Let users choose which cities/time zones appear on the Dashboard.
- Support the full time-zone catalog available to the web view, while surfacing common cities first.
- Preserve a deliberate user order across web and mobile layouts.
- Make adding, removing, and reordering usable with mouse, touch, and keyboard input.
- Default new or legacy settings to the device's detected local time zone.
- Allow users to remove every clock and recover through an add-city flow.
- Keep the existing live, 12-hour time display.

## Non-goals

- Adding a new persistence table or remote world-clock service.
- Synchronizing settings through a new backend mechanism.
- Supporting arbitrary custom labels for time zones.
- Changing the Dashboard's existing time format or refresh cadence.

## Data model and persistence

Extend `AppSettings` with:

```ts
world_clocks: string[];
```

Each entry is an IANA time-zone identifier, for example `Asia/Manila` or `America/New_York`. Array order is the display order.

The existing encrypted settings record remains the source of truth. `DEFAULT_SETTINGS` and settings normalization must support the new field. When a settings row does not contain `world_clocks`, normalization supplies the detected local time zone. A valid, explicitly saved empty array remains empty; it must not be replaced with a fallback clock. Malformed values are normalized safely, with invalid entries removed and duplicate IDs de-duplicated while preserving first occurrence order.

No Supabase migration is required because the settings payload is encrypted and stored as an application-settings value.

## Time-zone catalog

Add a focused world-clock utility module responsible for catalog and formatting concerns:

- Use `Intl.supportedValuesOf('timeZone')` when available.
- Provide a compatibility fallback for runtimes that do not expose that method.
- Maintain a curated set of common-city entries that are promoted to the top of search results.
- Derive readable city labels from IANA identifiers and retain the full identifier as supporting context.
- Calculate the current UTC offset using the runtime's time-zone formatting APIs so daylight-saving changes are represented accurately.
- Validate time-zone IDs before formatting. An unsupported saved ID must be skipped without causing the Dashboard or Settings view to fail.

The catalog should expose stable identifiers for persistence and presentation data for labels, region/context, and current offset. It should not store formatted clock times because those are time-dependent.

## Settings experience

Add a `World Clocks` tab to `SettingsView`.

The selected section will show, for each saved clock:

- friendly city label;
- IANA time-zone identifier or region context;
- current UTC offset;
- a visible drag handle;
- a remove action.

The add section will include a search field that matches friendly labels and IANA identifiers. Common cities appear first, followed by the complete supported catalog. Selected entries are marked as selected or disabled so they cannot be added twice. Changes persist immediately through the existing settings update callback.

Reordering will use pointer-based drag behavior with touch-friendly targets and an active-row state. The interaction must work in a narrow mobile layout as well as a desktop layout. Provide move-up and move-down controls as a keyboard-accessible fallback for users who cannot drag. The list order is saved after a successful reorder.

When there are no selected clocks, the tab will show a clear empty state with an add-city/search action rather than an error or automatic replacement.

## Dashboard experience

Remove the hardcoded `WORLD_CLOCKS` constant from `Dashboard.tsx`. Resolve `settings.world_clocks` through the catalog and render clocks in that array's order.

The existing World Clocks card keeps its current visual role and 12-hour format. Formatted times refresh once per second. If no clocks are selected, the card shows an empty state with an action that navigates to the World Clocks Settings tab. Unsupported saved zones are omitted from the rendered list without crashing the card.

## Error handling and compatibility

- Missing `world_clocks` in a legacy settings payload means “use the detected local time zone.”
- An explicit empty array means “show no clocks.”
- Invalid or unsupported entries are filtered from presentation and cannot be added from the catalog.
- Duplicate entries are removed during normalization.
- Formatting failures are isolated per clock so one invalid zone cannot break the full Dashboard.
- The local-time-zone detector falls back to `UTC` if the runtime does not provide a usable zone.

## Testing and verification

Add or extend unit tests for:

- default settings with a local-time-zone fallback;
- normalization of legacy rows without `world_clocks`;
- preserving a valid ordered list;
- de-duplicating entries;
- preserving an explicit empty list;
- filtering malformed or unsupported entries;
- catalog label and offset formatting.

Run the repository's existing checks:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

Manually verify responsive behavior in a browser and mobile-sized viewport: add a city, search by city name and IANA ID, remove a city, reorder by mouse, reorder by touch, use keyboard move controls, reload persistence, view the empty state, and confirm Dashboard times continue updating.

## Acceptance criteria

1. A new or legacy user sees only their detected local time zone by default.
2. Users can add any supported IANA time zone through Settings search.
3. Users can remove one or all clocks.
4. Users can reorder clocks with a touch- and mouse-compatible drag interaction, with keyboard controls available as a fallback.
5. The Dashboard displays the saved order and updates each clock every second.
6. Settings survive reload through the existing encrypted settings path.
7. Unsupported or malformed saved values do not crash the app.
8. Existing typecheck, lint, test, and production build checks pass.
