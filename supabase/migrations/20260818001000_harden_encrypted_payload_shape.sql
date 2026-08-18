alter table public.vault_metadata
  drop constraint if exists vault_metadata_envelope_is_encrypted;

alter table public.vault_metadata
  add constraint vault_metadata_envelope_is_encrypted check (
    jsonb_typeof(envelope) = 'object'
    and envelope = jsonb_build_object(
      'version', envelope->'version',
      'password', envelope->'password',
      'recovery', envelope->'recovery'
    )
    and envelope ? 'version'
    and envelope ? 'password'
    and envelope ? 'recovery'
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
    and envelope->'password' ? 'algorithm'
    and envelope->'password' ? 'kdf'
    and envelope->'password' ? 'salt'
    and envelope->'password' ? 'nonce'
    and envelope->'password' ? 'ciphertext'
    and envelope->'password' ? 'memory_size'
    and envelope->'password' ? 'iterations'
    and envelope->'password' ? 'parallelism'
    and envelope->'recovery' ? 'algorithm'
    and envelope->'recovery' ? 'kdf'
    and envelope->'recovery' ? 'salt'
    and envelope->'recovery' ? 'nonce'
    and envelope->'recovery' ? 'ciphertext'
    and envelope->'recovery' ? 'memory_size'
    and envelope->'recovery' ? 'iterations'
    and envelope->'recovery' ? 'parallelism'
    and envelope->'password'->>'algorithm' = 'AES-256-GCM'
    and envelope->'recovery'->>'algorithm' = 'AES-256-GCM'
    and envelope->'password'->>'kdf' = 'Argon2id'
    and envelope->'recovery'->>'kdf' = 'Argon2id'
  );

alter table public.vault_records
  drop constraint if exists vault_records_payload_is_encrypted;

alter table public.vault_records
  add constraint vault_records_payload_is_encrypted check (
    jsonb_typeof(payload) = 'object'
    and payload = jsonb_build_object(
      'version', payload->'version',
      'algorithm', payload->'algorithm',
      'nonce', payload->'nonce',
      'ciphertext', payload->'ciphertext'
    )
    and payload ? 'version'
    and payload ? 'algorithm'
    and payload ? 'nonce'
    and payload ? 'ciphertext'
    and payload->>'algorithm' = 'AES-256-GCM'
    and length(payload->>'nonce') > 0
    and length(payload->>'ciphertext') > 0
  );
