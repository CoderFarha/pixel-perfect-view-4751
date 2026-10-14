import { createFileRoute } from "@tanstack/react-router";
import {
  createSourcingIdHandlers,
  createSourcingRepository,
} from "../../../lib/api/sourcing.server.ts";
import { getAdminClient } from "../../../lib/supabase/admin.ts";

const handlers = createSourcingIdHandlers(createSourcingRepository(getAdminClient));

export const Route = createFileRoute("/api/sourcing/$id")({
  server: { handlers },
});
