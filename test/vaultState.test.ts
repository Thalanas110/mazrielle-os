import assert from 'node:assert/strict';
import test from 'node:test';
import { nextVaultState } from '../src/lib/vaultState.ts';

test('requires authentication before vault setup', () => {
  assert.equal(nextVaultState({ session: null, hasVault: false, unlocked: false }), 'signed_out');
});

test('requires setup for an authenticated user without a vault', () => {
  assert.equal(nextVaultState({ session: { userId: 'user-1' }, hasVault: false, unlocked: false }), 'setup_required');
});

test('requires unlock for an existing locked vault', () => {
  assert.equal(nextVaultState({ session: { userId: 'user-1' }, hasVault: true, unlocked: false }), 'locked');
});

test('allows workspace access only after unlock', () => {
  assert.equal(nextVaultState({ session: { userId: 'user-1' }, hasVault: true, unlocked: true }), 'unlocked');
});
