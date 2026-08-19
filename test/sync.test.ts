import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase.types.ts';
import { bootstrapVaultMetadata, SyncCancelledError, synchronizeVault, type SyncDependencies } from '../src/lib/sync.ts';
import { createSupabaseSyncTransport } from '../src/lib/syncTransport.ts';
import type { EncryptedSyncRow, RemoteVaultMetadata } from '../src/lib/syncTypes.ts';

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

function vaultMetadata(suffix = 'same'): RemoteVaultMetadata {
  const wrappedKey = {
    algorithm: 'AES-256-GCM' as const,
    kdf: 'Argon2id' as const,
    salt: `salt-${suffix}`,
    nonce: `nonce-${suffix}`,
    ciphertext: `ciphertext-${suffix}`,
    memory_size: 19_456,
    iterations: 2,
    parallelism: 1,
  };
  return {
    owner_id: 'user-1',
    envelope: { version: 1, password: wrappedKey, recovery: wrappedKey },
    created_at: '2026-08-19T00:00:00.000Z',
    updated_at: '2026-08-19T00:00:00.000Z',
  };
}

function encryptedRow(overrides: Partial<EncryptedSyncRow> = {}): EncryptedSyncRow {
  return {
    ...remoteRow(),
    ...overrides,
  } as EncryptedSyncRow;
}

function fakeSyncDependencies(options: {
  localMetadata?: RemoteVaultMetadata | null;
  remoteMetadata?: RemoteVaultMetadata | null;
  localRows?: EncryptedSyncRow[];
  remoteRows?: EncryptedSyncRow[];
  isUnlocked?: () => boolean;
}) {
  let localMetadata = options.localMetadata === undefined ? vaultMetadata() : options.localMetadata;
  let remoteMetadata = options.remoteMetadata === undefined ? vaultMetadata() : options.remoteMetadata;
  let localRows = [...(options.localRows ?? [])];
  let remoteRows = [...(options.remoteRows ?? [])];
  const calls: string[] = [];
  const store = {
    listRecords: async () => { calls.push('list-local'); return localRows; },
    upsertRecord: async (row: EncryptedSyncRow) => {
      calls.push('apply-local');
      localRows = [...localRows.filter(existing => existing.id !== row.id), row];
    },
    getVaultMetadata: async () => { calls.push('get-local-metadata'); return localMetadata; },
    saveVaultMetadata: async (metadata: RemoteVaultMetadata) => { calls.push('save-local-metadata'); localMetadata = metadata; },
  };
  const transport = {
    getAuthenticatedOwner: async () => { calls.push('get-session'); return 'user-1'; },
    getVaultMetadata: async () => { calls.push('get-remote-metadata'); return remoteMetadata; },
    upsertVaultMetadata: async (metadata: RemoteVaultMetadata) => { calls.push('upsert-remote-metadata'); remoteMetadata = metadata; },
    listRecords: async () => { calls.push('list-remote'); return remoteRows; },
    upsertRecords: async (rows: EncryptedSyncRow[]) => {
      calls.push('upsert-remote');
      remoteRows = [...remoteRows.filter(existing => !rows.some(row => row.id === existing.id)), ...rows];
    },
  };
  const dependencies: SyncDependencies = { store, transport, isUnlocked: options.isUnlocked ?? (() => true) };
  return { dependencies, store, transport, calls, getLocalRows: () => localRows };
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
                  const data = table === 'vault_records' ? optionsWithDefaults.records.slice(0, 100) : null;
                  return Promise.resolve(resolve({ data, error: null }));
                },
                range: async (from: number, to: number) => ({ data: table === 'vault_records' ? optionsWithDefaults.records.slice(from, to + 1) : null, error: null }),
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

test('reads every remote record page', async () => {
  const records = Array.from({ length: 101 }, (_, index) => remoteRow({ id: `record-${index}` }));
  const transport = createSupabaseSyncTransport(fakeClient({ records }));
  assert.equal((await transport.listRecords('user-1')).length, 101);
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

test('downloads remote metadata when no local vault exists', async () => {
  const fixture = fakeSyncDependencies({ localMetadata: null, remoteMetadata: vaultMetadata() });
  await bootstrapVaultMetadata('user-1', fixture.dependencies);
  assert.deepEqual(await fixture.store.getVaultMetadata('user-1'), vaultMetadata());
  assert.ok(fixture.calls.includes('save-local-metadata'));
});

test('uploads local-only encrypted records without decrypting them', async () => {
  const fixture = fakeSyncDependencies({ localRows: [encryptedRow()] });
  const result = await synchronizeVault('user-1', fixture.dependencies);
  assert.equal(result.pushed, 1);
  assert.ok(fixture.calls.includes('upsert-remote'));
});

test('pulls a newer remote record into the local store', async () => {
  const fixture = fakeSyncDependencies({
    localRows: [encryptedRow({ updated_at: '2026-08-19T00:01:00.000Z' })],
    remoteRows: [encryptedRow({ updated_at: '2026-08-19T00:02:00.000Z', payload: encryptedPayload('remote') })],
  });
  const result = await synchronizeVault('user-1', fixture.dependencies);
  assert.equal(result.pulled, 1);
  assert.equal(fixture.getLocalRows()[0].payload.ciphertext, 'remote');
});

test('rejects local and remote vault envelope mismatch', async () => {
  const fixture = fakeSyncDependencies({ localMetadata: vaultMetadata(), remoteMetadata: vaultMetadata('different') });
  await assert.rejects(() => synchronizeVault('user-1', fixture.dependencies), /vault metadata conflict/);
});

test('does not call transport while the vault is locked', async () => {
  const fixture = fakeSyncDependencies({ isUnlocked: () => false });
  await assert.rejects(() => synchronizeVault('user-1', fixture.dependencies), /locked/);
  assert.equal(fixture.calls.includes('get-session'), false);
});

test('does not apply a remote result after the sync run is invalidated', async () => {
  const fixture = fakeSyncDependencies({
    localRows: [encryptedRow({ updated_at: '2026-08-19T00:01:00.000Z' })],
    remoteRows: [encryptedRow({ updated_at: '2026-08-19T00:02:00.000Z', payload: encryptedPayload('remote') })],
  });
  let releaseRemoteRead: (() => void) | undefined;
  let remoteReadStarted: (() => void) | undefined;
  fixture.transport.listRecords = async () => {
    remoteReadStarted?.();
    await new Promise<void>(resolve => { releaseRemoteRead = resolve; });
    return [encryptedRow({ updated_at: '2026-08-19T00:02:00.000Z', payload: encryptedPayload('remote') })];
  };
  let active = true;
  const started = new Promise<void>(resolve => { remoteReadStarted = resolve; });
  const sync = synchronizeVault('user-1', fixture.dependencies, { isActive: () => active });
  await started;
  active = false;
  releaseRemoteRead?.();
  await assert.rejects(sync, SyncCancelledError);
  assert.equal(fixture.getLocalRows()[0].payload.ciphertext, 'ciphertext');
});
