import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase.types.ts';
import { createSupabaseSyncTransport } from '../src/lib/syncTransport.ts';

function encryptedPayload(ciphertext = 'ciphertext') {
  return { version: 1 as const, algorithm: 'AES-256-GCM' as const, nonce: 'nonce', ciphertext };
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

function fakeClient(options: {
  records?: unknown[];
  sessionOwner?: string;
  onRecordUpsert?: (rows: unknown[]) => void;
}) {
  const optionsWithDefaults = { records: [], sessionOwner: 'user-1', ...options };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: optionsWithDefaults.sessionOwner ? { user: { id: optionsWithDefaults.sessionOwner } } : null }, error: null }),
    },
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                then(resolve: (value: { data: unknown; error: null }) => unknown) {
                  return Promise.resolve(resolve({ data: table === 'vault_records' ? optionsWithDefaults.records : null, error: null }));
                },
                maybeSingle: async () => ({ data: null, error: null }),
              };
            },
          };
        },
        upsert(rows: unknown[]) {
          optionsWithDefaults.onRecordUpsert?.(rows);
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  return client;
}

test('reads the authenticated owner from Supabase Auth', async () => {
  const transport = createSupabaseSyncTransport(fakeClient({}));
  assert.equal(await transport.getAuthenticatedOwner(), 'user-1');
});

test('validates remote encrypted records before returning them', async () => {
  const transport = createSupabaseSyncTransport(fakeClient({ records: [remoteRow()] }));
  const records = await transport.listRecords('user-1');
  assert.equal(records[0].payload.algorithm, 'AES-256-GCM');
});

test('rejects a remote record for a different owner', async () => {
  const transport = createSupabaseSyncTransport(fakeClient({ records: [remoteRow({ owner_id: 'other-user' })] }));
  await assert.rejects(() => transport.listRecords('user-1'), /owner/);
});

test('validates encrypted rows before sending them to Supabase', async () => {
  let upsertCalls = 0;
  const transport = createSupabaseSyncTransport(fakeClient({ onRecordUpsert: () => { upsertCalls += 1; } }));
  await transport.upsertRecords([remoteRow() as never]);
  assert.equal(upsertCalls, 1);
});

test('rejects plaintext before making a remote write', async () => {
  let upsertCalls = 0;
  const transport = createSupabaseSyncTransport(fakeClient({ onRecordUpsert: () => { upsertCalls += 1; } }));
  await assert.rejects(() => transport.upsertRecords([remoteRow({ payload: 'plaintext' }) as never]), /encrypted payload/);
  assert.equal(upsertCalls, 0);
});
