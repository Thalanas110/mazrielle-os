import type { AppSettings } from './types.ts';
import { DEFAULT_SETTINGS } from './types.ts';
import { normalizeWorldClocks } from './worldClocks.ts';

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

export function settingsFromRow(row: Record<string, unknown> | undefined): AppSettings {
  if (!row) return { ...DEFAULT_SETTINGS, world_clocks: [...DEFAULT_SETTINGS.world_clocks] };
  return {
    display_name: String(row.display_name ?? DEFAULT_SETTINGS.display_name),
    theme: String(row.theme ?? DEFAULT_SETTINGS.theme) as AppSettings['theme'],
    accent_color: String(row.accent_color ?? DEFAULT_SETTINGS.accent_color),
    font_size: String(row.font_size ?? DEFAULT_SETTINGS.font_size) as AppSettings['font_size'],
    auto_lock: asBoolean(row.auto_lock, DEFAULT_SETTINGS.auto_lock),
    clipboard_clear: asBoolean(row.clipboard_clear, DEFAULT_SETTINGS.clipboard_clear),
    show_website_icons: asBoolean(row.show_website_icons, DEFAULT_SETTINGS.show_website_icons),
    world_clocks: normalizeWorldClocks(row.world_clocks, DEFAULT_SETTINGS.world_clocks),
  };
}
