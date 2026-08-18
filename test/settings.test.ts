import assert from 'node:assert/strict';
import test from 'node:test';
import { settingsFromRow } from '../src/lib/settings.ts';
import { DEFAULT_SETTINGS } from '../src/lib/types.ts';

test('returns settings defaults when the query has no row', () => {
  assert.deepEqual(settingsFromRow(undefined), DEFAULT_SETTINGS);
});

test('normalizes a settings row into the app settings contract', () => {
  assert.deepEqual(settingsFromRow({ display_name: 'Ada', theme: 'light', accent_color: '#000', font_size: 'large', auto_lock: false, clipboard_clear: true, show_website_icons: false }), {
    display_name: 'Ada', theme: 'light', accent_color: '#000', font_size: 'large', auto_lock: false, clipboard_clear: true, show_website_icons: false,
  });
});
