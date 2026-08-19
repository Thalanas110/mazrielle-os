import assert from 'node:assert/strict';
import test from 'node:test';
import type { VaultEnvelope } from '../src/lib/crypto.ts';
import {
  assertRemoteRecord,
  assertRemoteVaultMetadata,
  assertVaultEnvelope,
  isEncryptedPayload,
} from '../src/lib/syncValidation.ts';

function encryptedPayload() {
  return {
    version: 1 as const,
    algorithm: 'AES-256-GCM' as const,
    nonce: 'nonce',
    ciphertext: 'ciphertext',
  };
}

function wrappedKey() {
  return {
    algorithm: 'AES-256-GCM' as const,
    kdf: 'Argon2id' as const,
    salt: 'salt',
    nonce: 'nonce',
    ciphertext: 'ciphertext',
    memory_size: 19_456,
    iterations: 2,
    parallelism: 1,
  };
}

function vaultEnvelope(): VaultEnvelope {
  return {
    version: 1,
    password: wrappedKey(),
    recovery: wrappedKey(),
  };
}

function remoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'record-1',
    owner_id: 'user-1',
    record_type: 'credential',
    folder_id: null,
    payload: encryptedPayload(),
    created_at: '2026-08-19T00:00:00.000Z',
    updated_at: '2026-08-19T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

test('accepts an exact AES-256-GCM payload', () => {
  assert.equal(isEncryptedPayload(encryptedPayload()), true);
});

test('rejects plaintext and payloads with extra or invalid fields', () => {
  assert.equal(isEncryptedPayload('password'), false);
  assert.equal(isEncryptedPayload({ ...encryptedPayload(), plaintext: 'password' }), false);
  assert.equal(isEncryptedPayload({ ...encryptedPayload(), algorithm: 'AES-128-GCM' }), false);
  assert.equal(isEncryptedPayload({ ...encryptedPayload(), nonce: '' }), false);
});

test('accepts the exact vault envelope shape', () => {
  assert.deepEqual(assertVaultEnvelope(vaultEnvelope()), vaultEnvelope());
});

test('rejects a vault envelope with extra fields', () => {
  assert.throws(() => assertVaultEnvelope({ ...vaultEnvelope(), plaintext: 'secret' }), /envelope/);
});

test('accepts a remote row owned by the authenticated user', () => {
  assert.equal(assertRemoteRecord(remoteRow(), 'user-1').id, 'record-1');
});

test('accepts remote vault metadata owned by the authenticated user', () => {
  const metadata = {
    owner_id: 'user-1',
    envelope: vaultEnvelope(),
    created_at: '2026-08-19T00:00:00.000Z',
    updated_at: '2026-08-19T00:00:00.000Z',
  };
  assert.deepEqual(assertRemoteVaultMetadata(metadata, 'user-1'), metadata);
});

test('rejects a remote row owned by a different user', () => {
  assert.throws(() => assertRemoteRecord(remoteRow({ owner_id: 'other-user' }), 'user-1'), /owner/);
});

test('rejects unsupported record types and malformed timestamps', () => {
  assert.throws(() => assertRemoteRecord(remoteRow({ record_type: 'password' }), 'user-1'), /record type/);
  assert.throws(() => assertRemoteRecord(remoteRow({ updated_at: 'not-a-date' }), 'user-1'), /timestamp/);
});
