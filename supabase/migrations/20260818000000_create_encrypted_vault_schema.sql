create table if not exists public.vault_metadata (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  envelope jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_metadata_envelope_is_encrypted check (
    jsonb_typeof(envelope) = 'object'
    and envelope ? 'version'
    and envelope ? 'password'
    and envelope ? 'recovery'
    and envelope->'password'->>'algorithm' = 'AES-256-GCM'
    and envelope->'recovery'->>'algorithm' = 'AES-256-GCM'
    and envelope->'password'->>'kdf' = 'Argon2id'
    and envelope->'recovery'->>'kdf' = 'Argon2id'
  )
);

create table if not exists public.vault_records (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  record_type text not null,
  folder_id text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint vault_records_type_is_supported check (
    record_type in ('folder', 'credential', 'note', 'task', 'income', 'activity_log', 'app_settings')
  ),
  constraint vault_records_payload_is_encrypted check (
    jsonb_typeof(payload) = 'object'
    and payload ? 'version'
    and payload ? 'algorithm'
    and payload ? 'nonce'
    and payload ? 'ciphertext'
    and payload->>'algorithm' = 'AES-256-GCM'
    and length(payload->>'nonce') > 0
    and length(payload->>'ciphertext') > 0
  )
);

create index if not exists vault_records_owner_updated_idx
  on public.vault_records (owner_id, updated_at);

create index if not exists vault_records_owner_deleted_idx
  on public.vault_records (owner_id, deleted_at);

create or replace function public.set_vault_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vault_metadata_set_updated_at on public.vault_metadata;
create trigger vault_metadata_set_updated_at
before update on public.vault_metadata
for each row execute function public.set_vault_updated_at();

drop trigger if exists vault_records_set_updated_at on public.vault_records;
create trigger vault_records_set_updated_at
before update on public.vault_records
for each row execute function public.set_vault_updated_at();

alter table public.vault_metadata enable row level security;
alter table public.vault_metadata force row level security;
alter table public.vault_records enable row level security;
alter table public.vault_records force row level security;

revoke all on table public.vault_metadata from public, anon;
revoke all on table public.vault_records from public, anon;
grant select, insert, update, delete on table public.vault_metadata to authenticated;
grant select, insert, update, delete on table public.vault_records to authenticated;

drop policy if exists vault_metadata_owner_select on public.vault_metadata;
create policy vault_metadata_owner_select
on public.vault_metadata for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists vault_metadata_owner_insert on public.vault_metadata;
create policy vault_metadata_owner_insert
on public.vault_metadata for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists vault_metadata_owner_update on public.vault_metadata;
create policy vault_metadata_owner_update
on public.vault_metadata for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists vault_metadata_owner_delete on public.vault_metadata;
create policy vault_metadata_owner_delete
on public.vault_metadata for delete to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists vault_records_owner_select on public.vault_records;
create policy vault_records_owner_select
on public.vault_records for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists vault_records_owner_insert on public.vault_records;
create policy vault_records_owner_insert
on public.vault_records for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists vault_records_owner_update on public.vault_records;
create policy vault_records_owner_update
on public.vault_records for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists vault_records_owner_delete on public.vault_records;
create policy vault_records_owner_delete
on public.vault_records for delete to authenticated
using (owner_id = (select auth.uid()));
