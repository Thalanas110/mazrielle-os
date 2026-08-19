import assert from 'node:assert/strict';
import test from 'node:test';
import { canRetrySync, getSyncStatusLabel } from '../src/lib/syncStatus.ts';

test('labels sync states without exposing error details', () => {
  assert.equal(getSyncStatusLabel({ status: 'local' }), 'Local only');
  assert.equal(getSyncStatusLabel({ status: 'syncing' }), 'Syncing');
  assert.equal(getSyncStatusLabel({ status: 'synced', lastSyncedAt: '2026-08-19T00:00:00.000Z' }), 'Synced just now');
  assert.equal(getSyncStatusLabel({ status: 'error', error: 'network payload leaked' }), 'Sync failed, retry');
  assert.equal(getSyncStatusLabel({ status: 'conflict' }), 'Vault conflict');
  assert.equal(canRetrySync('error'), true);
  assert.equal(canRetrySync('conflict'), false);
});
