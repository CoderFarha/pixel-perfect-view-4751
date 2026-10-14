import { createFileRoute } from "@tanstack/react-router";
import {
  createClientIdHandlers,
  createClientsRepository,
} from "../../../lib/api/clients.server.ts";
import { getAdminClient } from "../../../lib/supabase/admin.ts";

const handlers = createClientIdHandlers(createClientsRepository(getAdminClient));

export const Route = createFileRoute("/api/clients/$id")({
  server: { handlers },
});
