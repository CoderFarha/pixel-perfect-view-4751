// SERVER ONLY — never import this module in client components.
// This service-role client bypasses RLS. Only use it after verifying the caller's identity.
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cached: SupabaseClient<Database> | null = null;

export function getAdminClient() {
  if (cached) return cached;

  const isNodeTest = process.env["NODE_TEST_CONTEXT"] !== undefined;
  const url = isNodeTest ? process.env["TEST_SUPABASE_URL"] : process.env["VITE_SUPABASE_URL"];
  const key = isNodeTest
    ? process.env["TEST_SUPABASE_SERVICE_ROLE_KEY"]
    : process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    const variables = isNodeTest
      ? "TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY"
      : "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY";
    throw new Error(`Missing Supabase server credentials. ${variables} must be set.`);
  }

  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
