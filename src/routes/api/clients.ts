import { createFileRoute } from "@tanstack/react-router";
import {
  createClientsCollectionHandlers,
  createClientsRepository,
} from "../../lib/api/clients.server.ts";
import { getAdminClient } from "../../lib/supabase/admin.ts";

const handlers = createClientsCollectionHandlers(createClientsRepository(getAdminClient));

export const Route = createFileRoute("/api/clients")({
  server: { handlers },
});
