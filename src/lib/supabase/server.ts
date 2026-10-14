import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

export function getSupabaseServerClient(request: Request) {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_ANON_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];

  if (!url || !key) {
    throw new Error("Supabase server auth is not configured.");
  }

  const authorization = request.headers.get("authorization");

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(authorization ? { global: { headers: { Authorization: authorization } } } : {}),
  });
}
