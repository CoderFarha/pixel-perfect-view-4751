-- ═══════════════════════════════════════════════════════════════
-- Migration: 20261012000002_rls_policies.sql
-- Purpose: Enable Row-Level Security + tenant isolation
-- ═══════════════════════════════════════════════════════════════

alter table public.tenants enable row level security;
alter table public.user_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.sourcing_requests enable row level security;
alter table public.sourcing_counters enable row level security;

drop policy if exists "tenants_self_access" on public.tenants;
drop policy if exists "user_profiles_self_access" on public.user_profiles;
drop policy if exists "clients_tenant_isolation" on public.clients;
drop policy if exists "sourcing_tenant_isolation" on public.sourcing_requests;
drop policy if exists "counters_tenant_isolation" on public.sourcing_counters;

create policy "tenants_self_access" on public.tenants
  for select
  to authenticated
  using (id = ((select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

create policy "user_profiles_self_access" on public.user_profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "clients_tenant_isolation" on public.clients
  for all
  to authenticated
  using (tenant_id = ((select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid))
  with check (tenant_id = ((select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

create policy "sourcing_tenant_isolation" on public.sourcing_requests
  for all
  to authenticated
  using (tenant_id = ((select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid))
  with check (tenant_id = ((select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

create policy "counters_tenant_isolation" on public.sourcing_counters
  for all
  to authenticated
  using (tenant_id = ((select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid))
  with check (tenant_id = ((select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));
