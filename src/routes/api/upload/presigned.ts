import { createFileRoute } from "@tanstack/react-router";
import {
  createPresignedUploadHandler,
  createSupabaseUploadProvider,
} from "../../../lib/api/upload.server.ts";
import { getAdminClient } from "../../../lib/supabase/admin.ts";

const handler = createPresignedUploadHandler(createSupabaseUploadProvider(getAdminClient));

export const Route = createFileRoute("/api/upload/presigned")({
  server: { handlers: { POST: handler } },
});
