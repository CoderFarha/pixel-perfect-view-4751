import assert from "node:assert/strict";
import test from "node:test";
import { cleanupTestTenant, createTestTenant, createTestUser } from "../db-helpers.ts";
import { getAdminClient } from "../../supabase/admin.ts";

const hasTestSupabaseCredentials = Boolean(
  process.env["TEST_SUPABASE_URL"] && process.env["TEST_SUPABASE_SERVICE_ROLE_KEY"],
);

test("createTestTenant returns a valid UUID", { skip: !hasTestSupabaseCredentials }, async () => {
  const tenantId = await createTestTenant();
  try {
    assert.match(tenantId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  } finally {
    await cleanupTestTenant(tenantId);
  }
});

test(
  "createTestUser creates a user_profiles row",
  { skip: !hasTestSupabaseCredentials },
  async () => {
    const tenantId = await createTestTenant();
    try {
      const userId = await createTestUser(tenantId);
      const { data, error } = await getAdminClient()
        .from("user_profiles")
        .select("id, tenant_id")
        .eq("id", userId)
        .single();

      assert.equal(error, null);
      assert.equal(data.id, userId);
      assert.equal(data.tenant_id, tenantId);
    } finally {
      await cleanupTestTenant(tenantId);
    }
  },
);

test(
  "cleanupTestTenant removes tenant and user profile data",
  { skip: !hasTestSupabaseCredentials },
  async () => {
    const tenantId = await createTestTenant();
    try {
      await createTestUser(tenantId);
    } finally {
      await cleanupTestTenant(tenantId);
    }

    const admin = getAdminClient();
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .maybeSingle();
    const { data: profiles, error: profilesError } = await admin
      .from("user_profiles")
      .select("id")
      .eq("tenant_id", tenantId);

    assert.equal(tenantError, null);
    assert.equal(profilesError, null);
    assert.equal(tenant, null);
    assert.deepEqual(profiles, []);
  },
);
