import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTaskStatus, TASK_STATUS_ORDER } from '../src/lib/taskStatuses.ts';

test('exposes the seven Kanban statuses in board order', () => {
  assert.deepEqual(TASK_STATUS_ORDER, [
    'future_plans',
    'current_sprint',
    'to_do',
    'doing',
    'on_hold',
    'blocked',
    'done',
  ]);
});

test('keeps every current status unchanged', () => {
  for (const status of TASK_STATUS_ORDER) assert.equal(normalizeTaskStatus(status), status);
});

test('maps legacy statuses into the current board', () => {
  assert.equal(normalizeTaskStatus('todo'), 'to_do');
  assert.equal(normalizeTaskStatus('in_progress'), 'doing');
  assert.equal(normalizeTaskStatus('completed'), 'done');
});

test('places missing or unknown statuses in To Do', () => {
  assert.equal(normalizeTaskStatus(undefined), 'to_do');
  assert.equal(normalizeTaskStatus(null), 'to_do');
  assert.equal(normalizeTaskStatus('not-a-status'), 'to_do');
});
