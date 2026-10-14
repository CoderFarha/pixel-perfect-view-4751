import { createFileRoute } from "@tanstack/react-router";
import { handleError } from "../../lib/api/respond.ts";
import { getHealthResponse } from "../../lib/api/health.ts";
import { getAdminClient } from "../../lib/supabase/admin.ts";

async function checkDatabase(): Promise<void> {
  const { error } = await getAdminClient().from("tenants").select("id").limit(1);
  if (error) throw error;
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return await getHealthResponse(checkDatabase);
        } catch (error) {
          return handleError(error, "api.health");
        }
      },
    },
  },
});
