// SERVER ONLY — never import this module in client components.
// This service-role client bypasses RLS. Only use it after verifying the caller's identity.
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

let cached: SupabaseClient<Database> | null = null;

export function getAdminClient() {
  if (cached) return cached;

  const url = process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "Missing Supabase server credentials. " +
        "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }

  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
