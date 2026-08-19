import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLocalEncryptedRow } from '../src/lib/syncLocalRepository.ts';

function encryptedPayload() {
  return {
    version: 1 as const,
    algorithm: 'AES-256-GCM' as const,
    nonce: 'nonce',
    ciphertext: 'ciphertext',
  };
}

function rawRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'record-1',
    owner_id: 'user-1',
    folder_id: null,
    payload: JSON.stringify(encryptedPayload()),
    created_at: '2026-08-19T00:00:00.000Z',
    updated_at: '2026-08-19T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

test('maps credentials to the singular remote type without decrypting payloads', () => {
  const row = parseLocalEncryptedRow('credentials', rawRow({ deleted_at: '2026-08-19T00:01:00.000Z' }));
  assert.equal(row.record_type, 'credential');
  assert.equal(row.deleted_at, '2026-08-19T00:01:00.000Z');
  assert.deepEqual(row.payload, encryptedPayload());
});

test('maps app settings without a folder', () => {
  const row = parseLocalEncryptedRow('app_settings', rawRow());
  assert.equal(row.record_type, 'app_settings');
  assert.equal(row.folder_id, null);
});

test('rejects malformed local ciphertext before it can be synchronized', () => {
  assert.throws(() => parseLocalEncryptedRow('notes', rawRow({ payload: 'plaintext' })), /encrypted payload/);
});
