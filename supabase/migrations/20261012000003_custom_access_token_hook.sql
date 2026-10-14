-- ═══════════════════════════════════════════════════════════════
-- Migration: 20261012000003_custom_access_token_hook.sql
-- Purpose: Inject tenant_id into JWTs at login/refresh
-- ═══════════════════════════════════════════════════════════════

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id
  from public.user_profiles
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if v_tenant_id is not null then
    claims := jsonb_set(
      claims,
      '{app_metadata, tenant_id}',
      to_jsonb(v_tenant_id::text)
    );
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant select on public.user_profiles to supabase_auth_admin;
grant select on public.tenants to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
