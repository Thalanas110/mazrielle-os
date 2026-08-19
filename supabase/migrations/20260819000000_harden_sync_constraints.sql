alter table public.vault_metadata
  drop constraint if exists vault_metadata_envelope_is_encrypted;

alter table public.vault_metadata
  add constraint vault_metadata_envelope_is_encrypted check (
    coalesce(
      jsonb_typeof(envelope) = 'object'
      and envelope = jsonb_build_object(
        'version', envelope->'version',
        'password', envelope->'password',
        'recovery', envelope->'recovery'
      )
      and envelope->'version' = '1'::jsonb
      and jsonb_typeof(envelope->'password') = 'object'
      and jsonb_typeof(envelope->'recovery') = 'object'
      and envelope->'password' = jsonb_build_object(
        'algorithm', envelope->'password'->'algorithm',
        'kdf', envelope->'password'->'kdf',
        'salt', envelope->'password'->'salt',
        'nonce', envelope->'password'->'nonce',
        'ciphertext', envelope->'password'->'ciphertext',
        'memory_size', envelope->'password'->'memory_size',
        'iterations', envelope->'password'->'iterations',
        'parallelism', envelope->'password'->'parallelism'
      )
      and envelope->'recovery' = jsonb_build_object(
        'algorithm', envelope->'recovery'->'algorithm',
        'kdf', envelope->'recovery'->'kdf',
        'salt', envelope->'recovery'->'salt',
        'nonce', envelope->'recovery'->'nonce',
        'ciphertext', envelope->'recovery'->'ciphertext',
        'memory_size', envelope->'recovery'->'memory_size',
        'iterations', envelope->'recovery'->'iterations',
        'parallelism', envelope->'recovery'->'parallelism'
      )
      and jsonb_typeof(envelope->'password'->'algorithm') = 'string'
      and jsonb_typeof(envelope->'password'->'kdf') = 'string'
      and jsonb_typeof(envelope->'password'->'salt') = 'string'
      and jsonb_typeof(envelope->'password'->'nonce') = 'string'
      and jsonb_typeof(envelope->'password'->'ciphertext') = 'string'
      and jsonb_typeof(envelope->'password'->'memory_size') = 'number'
      and jsonb_typeof(envelope->'password'->'iterations') = 'number'
      and jsonb_typeof(envelope->'password'->'parallelism') = 'number'
      and jsonb_typeof(envelope->'recovery'->'algorithm') = 'string'
      and jsonb_typeof(envelope->'recovery'->'kdf') = 'string'
      and jsonb_typeof(envelope->'recovery'->'salt') = 'string'
      and jsonb_typeof(envelope->'recovery'->'nonce') = 'string'
      and jsonb_typeof(envelope->'recovery'->'ciphertext') = 'string'
      and jsonb_typeof(envelope->'recovery'->'memory_size') = 'number'
      and jsonb_typeof(envelope->'recovery'->'iterations') = 'number'
      and jsonb_typeof(envelope->'recovery'->'parallelism') = 'number'
      and envelope->'password'->>'algorithm' = 'AES-256-GCM'
      and envelope->'recovery'->>'algorithm' = 'AES-256-GCM'
      and envelope->'password'->>'kdf' = 'Argon2id'
      and envelope->'recovery'->>'kdf' = 'Argon2id'
      and length(envelope->'password'->>'salt') > 0
      and length(envelope->'password'->>'nonce') > 0
      and length(envelope->'password'->>'ciphertext') > 0
      and length(envelope->'recovery'->>'salt') > 0
      and length(envelope->'recovery'->>'nonce') > 0
      and length(envelope->'recovery'->>'ciphertext') > 0
      and case
        when jsonb_typeof(envelope->'password'->'memory_size') = 'number'
        then (envelope->'password'->>'memory_size')::numeric between 1 and 1048576
        else false
      end
      and case
        when jsonb_typeof(envelope->'password'->'iterations') = 'number'
        then (envelope->'password'->>'iterations')::numeric between 1 and 1000
        else false
      end
      and case
        when jsonb_typeof(envelope->'password'->'parallelism') = 'number'
        then (envelope->'password'->>'parallelism')::numeric between 1 and 64
        else false
      end
      and case
        when jsonb_typeof(envelope->'recovery'->'memory_size') = 'number'
        then (envelope->'recovery'->>'memory_size')::numeric between 1 and 1048576
        else false
      end
      and case
        when jsonb_typeof(envelope->'recovery'->'iterations') = 'number'
        then (envelope->'recovery'->>'iterations')::numeric between 1 and 1000
        else false
      end
      and case
        when jsonb_typeof(envelope->'recovery'->'parallelism') = 'number'
        then (envelope->'recovery'->>'parallelism')::numeric between 1 and 64
        else false
      end,
      false
    )
  );

alter table public.vault_records
  drop constraint if exists vault_records_payload_is_encrypted;

alter table public.vault_records
  add constraint vault_records_payload_is_encrypted check (
    coalesce(
      jsonb_typeof(payload) = 'object'
      and payload = jsonb_build_object(
        'version', payload->'version',
        'algorithm', payload->'algorithm',
        'nonce', payload->'nonce',
        'ciphertext', payload->'ciphertext'
      )
      and payload->'version' = '1'::jsonb
      and jsonb_typeof(payload->'algorithm') = 'string'
      and jsonb_typeof(payload->'nonce') = 'string'
      and jsonb_typeof(payload->'ciphertext') = 'string'
      and payload->>'algorithm' = 'AES-256-GCM'
      and length(payload->>'nonce') > 0
      and length(payload->>'ciphertext') > 0,
      false
    )
  );
