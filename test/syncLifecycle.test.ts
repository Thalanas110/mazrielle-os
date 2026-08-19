import assert from 'node:assert/strict';
import test from 'node:test';
import { createSyncRunGuard } from '../src/lib/syncRunGuard.ts';

test('invalidates a stale sync run when the lifecycle owner changes', () => {
  const guard = createSyncRunGuard();
  const firstRun = guard.begin();
  assert.equal(guard.isCurrent(firstRun), true);
  guard.invalidate();
  assert.equal(guard.isCurrent(firstRun), false);
  const nextRun = guard.begin();
  assert.equal(guard.isCurrent(nextRun), true);
  assert.notEqual(nextRun, firstRun);
});
