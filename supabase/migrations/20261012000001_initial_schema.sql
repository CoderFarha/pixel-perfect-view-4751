-- ═══════════════════════════════════════════════════════════════
-- Migration: 20261012000001_initial_schema.sql
-- Purpose: Core tables for TradeHub multi-tenant SaaS
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tenants_slug on public.tenants(slug);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id),
  email text,
  name text,
  role text default 'STAFF' check (role in ('OWNER', 'ADMIN', 'STAFF', 'AGENT', 'CLIENT')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_profiles_tenant on public.user_profiles(tenant_id);
create index if not exists idx_user_profiles_email on public.user_profiles(email);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text,
  phone text not null,
  whatsapp text,
  email text,
  country text default 'Kenya',
  city text,
  currency text default 'KES',
  source text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_clients_tenant on public.clients(tenant_id);
create index if not exists idx_clients_phone on public.clients(tenant_id, phone);
create index if not exists idx_clients_deleted on public.clients(deleted_at);

create table if not exists public.sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  request_code text not null,
  client_id uuid references public.clients(id),
  raw_message text,
  client_images text[] default '{}',
  screenshots text[] default '{}',
  source text default 'whatsapp',
  quantity int,
  unit text default 'pieces',
  destination text default 'Nairobi, Kenya',
  target_price_cny numeric(10,2),
  category text,
  deadline date,
  requirements text,
  ai_category text,
  ai_material text,
  ai_keywords text[] default '{}',
  ai_confidence numeric(3,2),
  ai_analysis jsonb,
  status text default 'RECEIVED' check (status in (
    'RECEIVED', 'ANALYZING', 'RFQ_SENT',
    'QUOTES_RECEIVED', 'CLIENT_QUOTED', 'ORDERED', 'CANCELLED'
  )),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, request_code)
);

create index if not exists idx_sourcing_tenant on public.sourcing_requests(tenant_id);
create index if not exists idx_sourcing_status on public.sourcing_requests(tenant_id, status);
create index if not exists idx_sourcing_client on public.sourcing_requests(client_id);
create index if not exists idx_sourcing_created on public.sourcing_requests(tenant_id, created_at desc);

create table if not exists public.sourcing_counters (
  tenant_id uuid primary key,
  year int not null,
  last_seq int default 0,
  updated_at timestamptz default now()
);

create or replace function public.generate_sourcing_code(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year int := extract(year from now())::int;
  v_seq int;
begin
  insert into public.sourcing_counters (tenant_id, year, last_seq)
  values (p_tenant_id, v_year, 1)
  on conflict (tenant_id)
  do update set
    last_seq = case
      when public.sourcing_counters.year = v_year
        then public.sourcing_counters.last_seq + 1
      else 1
    end,
    year = v_year,
    updated_at = now()
  returning last_seq into v_seq;

  return 'SR-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

grant execute on function public.generate_sourcing_code(uuid) to authenticated;
