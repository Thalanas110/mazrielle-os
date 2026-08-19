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
