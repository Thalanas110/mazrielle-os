import assert from 'node:assert/strict';
import test from 'node:test';
import { generateRecoveryKey, validateMasterPassword } from '../src/lib/vault.ts';

test('requires a master passphrase of at least fourteen characters', () => {
  assert.equal(validateMasterPassword('short'), 'Master password must be at least 14 characters');
  assert.equal(validateMasterPassword('fourteen_chars'), null);
});

test('generates a recovery key that is safe to store externally', () => {
  const key = generateRecoveryKey();
  assert.match(key, /^[A-Z2-9-]+$/);
  assert.ok(key.length >= 20);
});
