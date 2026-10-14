import { createFileRoute } from "@tanstack/react-router";
import {
  createSourcingCollectionHandlers,
  createSourcingRepository,
} from "../../lib/api/sourcing.server.ts";
import { getAdminClient } from "../../lib/supabase/admin.ts";

const handlers = createSourcingCollectionHandlers(createSourcingRepository(getAdminClient));

export const Route = createFileRoute("/api/sourcing")({
  server: { handlers },
});
