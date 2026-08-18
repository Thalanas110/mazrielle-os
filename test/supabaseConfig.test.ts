import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthRedirectUrl } from '../src/lib/supabaseConfig.ts';

test('prefers the configured auth redirect URL', () => {
  assert.equal(getAuthRedirectUrl('https://app.example.test', 'http://localhost:5173'), 'https://app.example.test');
});

test('falls back to the current origin when no redirect is configured', () => {
  assert.equal(getAuthRedirectUrl('  ', 'capacitor://localhost'), 'capacitor://localhost');
});

test('returns undefined when no redirect context exists', () => {
  assert.equal(getAuthRedirectUrl(undefined, undefined), undefined);
});
