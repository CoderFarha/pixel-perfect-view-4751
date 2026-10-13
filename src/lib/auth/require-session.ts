import { fail } from "../api/respond.ts";
import { getSupabaseServerClient } from "../supabase/server.ts";
import { logError } from "../logger.ts";

export type SessionContext = { userId: string; tenantId: string; email: string };

type VerifiedUser = { id: string; app_metadata?: unknown; email?: string };
type TokenVerifier = (accessToken: string) => Promise<VerifiedUser | null>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function verifySupabaseAccessToken(accessToken: string): Promise<VerifiedUser | null> {
  const request = new Request("https://tradehub.invalid", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const { data, error } = await getSupabaseServerClient(request).auth.getUser();

  if (error || !data.user) return null;
  return {
    id: data.user.id,
    app_metadata: data.user.app_metadata,
    ...(data.user.email ? { email: data.user.email } : {}),
  };
}

export function createRequireSession(verifyToken: TokenVerifier) {
  return async (request: Request): Promise<SessionContext> => {
    const authorization = request.headers.get("authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match?.[1]) throw fail("UNAUTHORIZED", "A valid bearer token is required.", 401);

    let user: VerifiedUser | null;
    try {
      user = await verifyToken(match[1]);
    } catch (error) {
      logError("auth.session_verification_unavailable", error);
      throw fail("AUTH_UNAVAILABLE", "Authentication could not be verified.", 503);
    }

    if (!user) throw fail("UNAUTHORIZED", "The bearer token is invalid or expired.", 401);

    const appMetadata = isRecord(user.app_metadata) ? user.app_metadata : null;
    const tenantId = appMetadata?.["tenant_id"];
    if (typeof tenantId !== "string" || tenantId.length === 0) {
      throw fail("NO_TENANT", "The authenticated user is not assigned to a tenant.", 403);
    }

    return { userId: user.id, tenantId, email: user.email ?? "" };
  };
}

export const requireSession = createRequireSession(verifySupabaseAccessToken);
