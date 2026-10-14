# Supabase Migrations

## Files

- `20261012000001_initial_schema.sql` — Tables + code generator
- `20261012000002_rls_policies.sql` — RLS policies for tenant isolation
- `20261012000003_custom_access_token_hook.sql` — JWT hook that injects tenant_id

## How to apply

### Option A — Supabase Dashboard (manual)
1. Open Supabase → your project → SQL Editor
2. Paste and run each file in order
3. Enable the auth hook in Authentication → Hooks → Custom Access Token

### Option B — Supabase CLI (automated)
```bash
npx supabase link --project-ref pvpkbpeismsyiioefvrt
npx supabase db push
```

## Production tenant
- ID: `82aeb56e-1da2-4143-bd3d-6a9e13ad5f1f`
- Slug: `tradehub-main`

## Required manual step after migration
Enable the auth hook in the Supabase Dashboard:
1. Authentication → Hooks → Custom Access Token
2. Select: `public.custom_access_token_hook`
3. Save and verify status shows Enabled

Without this step, JWTs won't contain `tenant_id` and RLS will return zero rows.
