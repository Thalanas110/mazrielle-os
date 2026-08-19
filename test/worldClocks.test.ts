import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatUtcOffset,
  formatWorldClockTime,
  getLocalTimeZone,
  getWorldClockOption,
  getWorldClockOptions,
  isSupportedTimeZone,
  normalizeWorldClocks,
  reorderWorldClocks,
} from '../src/lib/worldClocks.ts';

const newYear = new Date('2024-01-01T00:00:00.000Z');

test('detects a usable local zone or UTC fallback', () => {
  assert.equal(isSupportedTimeZone(getLocalTimeZone()), true);
});

test('formats a clock and offset for a known zone', () => {
  assert.equal(formatWorldClockTime('Asia/Manila', newYear), '08:00 AM');
  assert.equal(formatUtcOffset('Asia/Manila', newYear), 'UTC+08:00');
});

test('rejects unsupported zone IDs without throwing', () => {
  assert.equal(isSupportedTimeZone('Invalid/Zone'), false);
  assert.equal(getWorldClockOption('Invalid/Zone', newYear), undefined);
});

test('puts common cities before the full catalog and exposes searchable labels', () => {
  const options = getWorldClockOptions(newYear);
  assert.equal(options[0].timeZone, 'Asia/Manila');
  assert.equal(options.find(option => option.timeZone === 'America/New_York')?.city, 'New York');
  assert.match(options.find(option => option.timeZone === 'Asia/Manila')?.searchText ?? '', /manila/);
});

test('normalizes IDs while preserving order and explicit emptiness', () => {
  assert.deepEqual(
    normalizeWorldClocks(['Asia/Manila', 'Invalid/Zone', 'Asia/Manila', 'Europe/London']),
    ['Asia/Manila', 'Europe/London'],
  );
  assert.deepEqual(normalizeWorldClocks(undefined, ['Europe/London']), ['Europe/London']);
  assert.deepEqual(normalizeWorldClocks([], ['Europe/London']), []);
});

test('reorders a selected list by moving the active ID before the target ID', () => {
  assert.deepEqual(
    reorderWorldClocks(['Asia/Manila', 'Europe/London', 'Asia/Tokyo'], 'Asia/Tokyo', 'Asia/Manila'),
    ['Asia/Tokyo', 'Asia/Manila', 'Europe/London'],
  );
});
