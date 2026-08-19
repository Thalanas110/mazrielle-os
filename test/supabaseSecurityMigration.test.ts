import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../supabase/migrations/20260819000000_harden_sync_constraints.sql', import.meta.url), 'utf8');

test('pins encrypted payloads to version one with null-safe type checks', () => {
  assert.match(migration, /coalesce\(/i);
  assert.match(migration, /payload->'version'\s*=\s*'1'::jsonb/i);
  assert.match(migration, /jsonb_typeof\(payload->'nonce'\)\s*=\s*'string'/i);
  assert.match(migration, /jsonb_typeof\(payload->'ciphertext'\)\s*=\s*'string'/i);
});

test('bounds wrapped-key KDF parameters and validates their JSON types', () => {
  assert.match(migration, /jsonb_typeof\(envelope->'password'->'memory_size'\)\s*=\s*'number'/i);
  assert.match(migration, /between 1 and 1048576/i);
  assert.match(migration, /between 1 and 1000/i);
  assert.match(migration, /between 1 and 64/i);
  assert.match(migration, /jsonb_typeof\(envelope->'recovery'->'parallelism'\)\s*=\s*'number'/i);
});
