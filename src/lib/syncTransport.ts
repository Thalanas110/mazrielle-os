import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase.ts';
import type { Database, Json } from './supabase.types.ts';
import { assertRemoteRecord, assertRemoteVaultMetadata } from './syncValidation.ts';
import type { EncryptedSyncRow, RemoteVaultMetadata, SyncTransport } from './syncTypes.ts';

const RECORD_COLUMNS = 'id,owner_id,record_type,folder_id,payload,created_at,updated_at,deleted_at';
const METADATA_COLUMNS = 'owner_id,envelope,created_at,updated_at';
const RECORD_BATCH_SIZE = 100;

type SupabaseDatabaseClient = SupabaseClient<Database>;

function throwTransportError(message: string): never {
  throw new Error(message);
}

export function createSupabaseSyncTransport(client: SupabaseDatabaseClient = getSupabase()): SyncTransport {
  return {
    async getAuthenticatedOwner() {
      const { data, error } = await client.auth.getSession();
      if (error) throwTransportError('Could not read Supabase session');
      return data.session?.user.id ?? null;
    },

    async getVaultMetadata(ownerId: string) {
      const { data, error } = await client
        .from('vault_metadata')
        .select(METADATA_COLUMNS)
        .eq('owner_id', ownerId)
        .maybeSingle();
      if (error) throwTransportError('Could not read remote vault metadata');
      if (!data) return null;
      return assertRemoteVaultMetadata(data, ownerId);
    },

    async upsertVaultMetadata(metadata: RemoteVaultMetadata) {
      const validated = assertRemoteVaultMetadata(metadata, metadata.owner_id);
      const metadataInsert: Database['public']['Tables']['vault_metadata']['Insert'] = {
        owner_id: validated.owner_id,
        envelope: validated.envelope as unknown as Json,
        created_at: validated.created_at,
        updated_at: validated.updated_at,
      };
      const { error } = await client.from('vault_metadata').upsert(metadataInsert, { onConflict: 'owner_id' });
      if (error) throwTransportError('Could not write remote vault metadata');
    },

    async listRecords(ownerId: string) {
      const { data, error } = await client
        .from('vault_records')
        .select(RECORD_COLUMNS)
        .eq('owner_id', ownerId);
      if (error) throwTransportError('Could not read remote vault records');
      return (data ?? []).map(row => assertRemoteRecord(row, ownerId));
    },

    async upsertRecords(rows: EncryptedSyncRow[]) {
      for (let index = 0; index < rows.length; index += RECORD_BATCH_SIZE) {
        const batch: Database['public']['Tables']['vault_records']['Insert'][] = rows.slice(index, index + RECORD_BATCH_SIZE).map(row => {
          const validated = assertRemoteRecord(row, row.owner_id);
          return {
            id: validated.id,
            owner_id: validated.owner_id,
            record_type: validated.record_type,
            folder_id: validated.folder_id,
            payload: validated.payload as unknown as Json,
            created_at: validated.created_at,
            updated_at: validated.updated_at,
            deleted_at: validated.deleted_at,
          };
        });
        const { error } = await client.from('vault_records').upsert(batch, { onConflict: 'id' });
        if (error) throwTransportError('Could not write remote vault records');
      }
    },
  };
}
