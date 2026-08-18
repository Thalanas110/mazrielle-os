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
