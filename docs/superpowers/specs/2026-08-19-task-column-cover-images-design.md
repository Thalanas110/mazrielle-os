# Task Column Cover Images

## Context

The Tasks view currently renders three status columns—To Do, In Progress, and Completed—with a text-only heading above each task list. The requested change is a Trello-inspired decorative cover image for each category, while keeping task behavior and the existing local-first application architecture unchanged.

## Goals

- Add one distinct, configurable image slot above each task column.
- Support user-provided local image files such as PNG, JPG, WebP, and SVG.
- Keep image configuration centralized so a filename or extension can be changed without restructuring the component.
- Preserve the current task interactions, counts, cards, empty states, and responsive three-column layout.
- Avoid broken-image UI when a slot is empty or a file is unavailable.

## Non-goals

- No image upload UI or image-management workflow.
- No remote image fetching or third-party image service.
- No persistence of cover-image metadata in the encrypted vault.
- No changes to task statuses, ordering, editing, deletion, or form behavior.

## Asset interface

Create a `public/task-covers/` directory as the user-facing drop location for cover assets. Add a centralized `COLUMN_COVERS` map in `src/views/Tasks.tsx` keyed by the existing `TaskStatus` values:

- `todo`
- `in_progress`
- `completed`

Each entry contains the public URL/path for its image. The default paths are documented and can be changed to any supported local file extension. The implementation must not require all three files to exist for the page to render.

## Rendering design

Each column remains a flex column. Above its existing status heading, render a shallow cover region spanning the column width. When an image loads, it fills the region with `object-cover`; the image is decorative and uses an empty `alt` attribute. The existing colored status marker, label, and task count remain below the cover.

The cover region should use the column's existing status color as a fallback background. If the image fails to load, the failed image element is hidden or otherwise removed from view while the fallback remains visible. The column cover and heading should have a cohesive rounded/bordered treatment without changing the task-card styling.

The layout must remain responsive: the current single-column mobile flow and three-column large-screen flow are preserved, and the cover scales to the available column width without distorting its aspect ratio.

## Accessibility and behavior

- Covers are decorative only and must not introduce redundant screen-reader text.
- Cover failures must not affect loading or interaction with tasks.
- No new interactive controls are added.
- Existing keyboard-accessible task controls and buttons remain unchanged.

## Verification

- Run typecheck, lint, and the production build.
- Confirm the Tasks view renders with no cover files present.
- Confirm each configured local image displays when supplied in `public/task-covers/`.
- Confirm at least one alternate extension/path can be configured without code outside the centralized map.
- Confirm task status toggling, editing, deletion, empty states, and responsive layout remain intact.
