import assert from 'node:assert/strict';
import test from 'node:test';
import { settingsFromRow } from '../src/lib/settings.ts';
import { DEFAULT_SETTINGS } from '../src/lib/types.ts';
import { getLocalTimeZone } from '../src/lib/worldClocks.ts';

test('returns settings defaults when the query has no row', () => {
  assert.deepEqual(settingsFromRow(undefined), DEFAULT_SETTINGS);
});

test('normalizes a settings row into the app settings contract', () => {
  assert.deepEqual(settingsFromRow({ display_name: 'Ada', theme: 'light', accent_color: '#000', font_size: 'large', auto_lock: false, clipboard_clear: true, show_website_icons: false, world_clocks: ['Asia/Tokyo', 'Asia/Tokyo'] }), {
    display_name: 'Ada', theme: 'light', accent_color: '#000', font_size: 'large', auto_lock: false, clipboard_clear: true, show_website_icons: false, world_clocks: ['Asia/Tokyo'],
  });
});

test('defaults a missing clock list to the local time zone', () => {
  assert.deepEqual(settingsFromRow({}).world_clocks, [getLocalTimeZone()]);
});

test('normalizes clock IDs while preserving the saved order', () => {
  assert.deepEqual(
    settingsFromRow({ world_clocks: ['Asia/Tokyo', 'Invalid/Zone', 'Asia/Manila', 'Asia/Tokyo'] }).world_clocks,
    ['Asia/Tokyo', 'Asia/Manila'],
  );
});

test('preserves an explicitly empty clock list', () => {
  assert.deepEqual(settingsFromRow({ world_clocks: [] }).world_clocks, []);
});
