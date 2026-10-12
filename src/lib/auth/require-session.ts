import { fail } from "../api/respond.ts";

export type SessionContext = { userId: string; tenantId: string };

type VerifiedUser = { id: string; app_metadata?: unknown };
type TokenVerifier = (accessToken: string) => Promise<VerifiedUser | null>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function verifySupabaseAccessToken(accessToken: string): Promise<VerifiedUser | null> {
  const supabaseUrl = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_ANON_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase auth is not configured.");

  const response = await fetch(new URL("/auth/v1/user", supabaseUrl), {
    headers: { apikey: supabaseKey, authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;

  const payload: unknown = await response.json();
  if (!isRecord(payload) || typeof payload["id"] !== "string") return null;
  return { id: payload["id"], app_metadata: payload["app_metadata"] };
}

export function createRequireSession(verifyToken: TokenVerifier) {
  return async (request: Request): Promise<SessionContext> => {
    const authorization = request.headers.get("authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match?.[1]) throw fail("UNAUTHORIZED", "A valid bearer token is required.", 401);

    let user: VerifiedUser | null;
    try {
      user = await verifyToken(match[1]);
    } catch {
      throw fail("AUTH_UNAVAILABLE", "Authentication could not be verified.", 503);
    }

    if (!user) throw fail("UNAUTHORIZED", "The bearer token is invalid or expired.", 401);

    const appMetadata = isRecord(user.app_metadata) ? user.app_metadata : null;
    const tenantId = appMetadata?.["tenant_id"];
    if (typeof tenantId !== "string" || tenantId.length === 0) {
      throw fail("NO_TENANT", "The authenticated user is not assigned to a tenant.", 403);
    }

    return { userId: user.id, tenantId };
  };
}

export const requireSession = createRequireSession(verifySupabaseAccessToken);
