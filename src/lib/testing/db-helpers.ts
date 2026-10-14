import { randomInt, randomUUID } from "node:crypto";
import { getAdminClient } from "../supabase/admin.ts";

let phoneSequence = randomInt(0, 100_000_000);

/**
 * Inserts an isolated test tenant and returns its UUID.
 */
export async function createTestTenant(): Promise<string> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .insert({ slug: `test-${randomUUID()}`, name: "Test tenant" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create test tenant: ${error.message}`);
  }

  return data.id;
}

/**
 * Creates a confirmed Supabase auth user and matching profile for a test tenant.
 */
export async function createTestUser(tenantId: string): Promise<string> {
  const admin = getAdminClient();
  const email = `test-${randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create test auth user: ${error.message}`);
  }

  const userId = data.user.id;
  const { error: profileError } = await admin.from("user_profiles").insert({
    id: userId,
    tenant_id: tenantId,
    email,
    name: "Test user",
  });

  if (profileError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
    if (cleanupError) {
      throw new AggregateError(
        [new Error(profileError.message), new Error(cleanupError.message)],
        "Failed to create test user and clean up its auth account.",
      );
    }
    throw new Error(`Failed to create test user profile: ${profileError.message}`);
  }

  return userId;
}

/**
 * Deletes data belonging to a test tenant; non-test tenants are left untouched.
 */
export async function cleanupTestTenant(tenantId: string): Promise<void> {
  const admin = getAdminClient();
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .like("slug", "test-%")
    .maybeSingle();

  if (tenantError) {
    throw new Error(`Failed to find test tenant for cleanup: ${tenantError.message}`);
  }
  if (!tenant) return;

  const { error: requestsError } = await admin
    .from("sourcing_requests")
    .delete()
    .eq("tenant_id", tenantId);
  if (requestsError) {
    throw new Error(`Failed to clean up test sourcing requests: ${requestsError.message}`);
  }

  const { error: clientsError } = await admin.from("clients").delete().eq("tenant_id", tenantId);
  if (clientsError) {
    throw new Error(`Failed to clean up test clients: ${clientsError.message}`);
  }

  const { error: countersError } = await admin
    .from("sourcing_counters")
    .delete()
    .eq("tenant_id", tenantId);
  if (countersError) {
    throw new Error(`Failed to clean up test sourcing counters: ${countersError.message}`);
  }

  const { data: profiles, error: profilesError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("tenant_id", tenantId);
  if (profilesError) {
    throw new Error(`Failed to find test user profiles for cleanup: ${profilesError.message}`);
  }

  for (const profile of profiles) {
    const { error } = await admin.auth.admin.deleteUser(profile.id);
    if (error) {
      throw new Error(`Failed to clean up test auth user: ${error.message}`);
    }
  }

  const { error: remainingProfilesError } = await admin
    .from("user_profiles")
    .delete()
    .eq("tenant_id", tenantId);
  if (remainingProfilesError) {
    throw new Error(`Failed to clean up test user profiles: ${remainingProfilesError.message}`);
  }

  const { error: deleteTenantError } = await admin.from("tenants").delete().eq("id", tenantId);
  if (deleteTenantError) {
    throw new Error(`Failed to delete test tenant: ${deleteTenantError.message}`);
  }
}

/**
 * Generates a unique Kenyan-format phone number for test fixtures.
 */
export function generateTestPhone(): string {
  const phoneSuffix = phoneSequence.toString().padStart(8, "0");
  phoneSequence = (phoneSequence + 1) % 100_000_000;
  return `+2547${phoneSuffix}`;
}
