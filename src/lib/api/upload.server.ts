import { z } from "zod";
import { requireSession, type SessionContext } from "../auth/require-session.ts";
import { fail, handleError, ok } from "./respond.ts";

const contentTypeExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

const presignedUploadInputSchema = z
  .object({
    filename: z
      .string()
      .min(1)
      .max(199)
      .refine(
        (filename) =>
          !filename.includes("..") &&
          !filename.includes("/") &&
          !filename.includes("\\") &&
          !filename.includes("\0"),
        "Filename must not contain path separators or traversal segments.",
      ),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
    folder: z.enum(["screenshots", "products", "proofs"]),
  })
  .strict();

export type PresignedUploadInput = z.infer<typeof presignedUploadInputSchema>;

type Authenticate = (request: Request) => Promise<SessionContext>;
type SignedUploadProvider = {
  createSignedUploadUrl(key: string): Promise<{ uploadUrl: string; publicUrl: string }>;
};

export function createPresignedUploadHandler(
  provider: SignedUploadProvider,
  authenticate: Authenticate = requireSession,
  now: () => Date = () => new Date(),
  uuid: () => string = () => crypto.randomUUID(),
) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    try {
      const session = await authenticate(request);
      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw fail("INVALID_JSON", "Request body must be valid JSON.", 400);
        }
        throw error;
      }
      const input = presignedUploadInputSchema.parse(rawBody);
      const extension = contentTypeExtensions[input.contentType];
      const date = now();
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const key = `${session.tenantId}/${input.folder}/${year}-${month}/${uuid()}.${extension}`;
      const signed = await provider.createSignedUploadUrl(key);
      return ok({ uploadUrl: signed.uploadUrl, key, publicUrl: signed.publicUrl });
    } catch (error) {
      return handleError(error, "api.upload.presigned");
    }
  };
}

const uploadBucket = "tradehub-uploads";

export function createSupabaseUploadProvider(
  getClient: () => ReturnType<typeof import("../supabase/admin.ts").getAdminClient>,
): SignedUploadProvider {
  return {
    async createSignedUploadUrl(key) {
      const storage = getClient().storage.from(uploadBucket);
      const { data, error } = await storage.createSignedUploadUrl(key);
      if (error) throw error;
      const { data: publicData } = storage.getPublicUrl(data.path);
      return { uploadUrl: data.signedUrl, publicUrl: publicData.publicUrl };
    },
  };
}
