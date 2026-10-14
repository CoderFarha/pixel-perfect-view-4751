alter table public.sourcing_requests
  add column if not exists deleted_at timestamptz,
  add column if not exists source_notes text;

create index if not exists idx_sourcing_tenant_active_id
  on public.sourcing_requests (tenant_id, id)
  where deleted_at is null;

create unique index if not exists idx_clients_tenant_phone_active
  on public.clients (tenant_id, phone)
  where deleted_at is null;
