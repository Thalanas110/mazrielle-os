import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMergePlan, SyncConflictError } from '../src/lib/syncMerge.ts';

const BASE_TIME = '2026-08-19T00:00:00.000Z';

function row(id: string, updated_at = BASE_TIME, deleted_at: string | null = null, ciphertext = 'ciphertext') {
  return {
    id,
    owner_id: 'user-1',
    record_type: 'credential' as const,
    folder_id: null,
    payload: { version: 1 as const, algorithm: 'AES-256-GCM' as const, nonce: 'nonce', ciphertext },
    created_at: BASE_TIME,
    updated_at,
    deleted_at,
  };
}

test('pushes a local-only row and applies a remote-only row', () => {
  const plan = buildMergePlan([row('local-only')], [row('remote-only')]);
  assert.deepEqual(plan.pushToRemote.map(item => item.id), ['local-only']);
  assert.deepEqual(plan.applyToLocal.map(item => item.id), ['remote-only']);
  assert.equal(plan.unchanged, 0);
});

test('pushes local content when its timestamp is newer', () => {
  const plan = buildMergePlan([row('record-1', '2026-08-19T00:02:00.000Z')], [row('record-1', '2026-08-19T00:01:00.000Z')]);
  assert.deepEqual(plan.pushToRemote.map(item => item.id), ['record-1']);
  assert.equal(plan.applyToLocal.length, 0);
});

test('applies remote content when its timestamp is newer', () => {
  const plan = buildMergePlan([row('record-1', '2026-08-19T00:01:00.000Z')], [row('record-1', '2026-08-19T00:02:00.000Z')]);
  assert.deepEqual(plan.applyToLocal.map(item => item.id), ['record-1']);
  assert.equal(plan.pushToRemote.length, 0);
});

test('remote tombstones win when they are newer', () => {
  const plan = buildMergePlan(
    [row('record-1', '2026-08-19T00:00:00.000Z')],
    [row('record-1', '2026-08-19T00:01:00.000Z', '2026-08-19T00:01:00.000Z')],
  );
  assert.deepEqual(plan.applyToLocal.map(item => item.deleted_at), ['2026-08-19T00:01:00.000Z']);
});

test('does not change identical rows', () => {
  const plan = buildMergePlan([row('record-1')], [row('record-1')]);
  assert.equal(plan.unchanged, 1);
  assert.equal(plan.pushToRemote.length, 0);
  assert.equal(plan.applyToLocal.length, 0);
});

test('rejects equal timestamps with different ciphertext', () => {
  assert.throws(
    () => buildMergePlan([row('record-1')], [row('record-1', BASE_TIME, null, 'different')]),
    SyncConflictError,
  );
});
