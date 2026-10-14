import { logError } from "../logger.ts";

const version = "2026-10-14";

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function getHealthResponse(
  checkDatabase: () => Promise<void>,
  now: () => number = Date.now,
): Promise<Response> {
  const startedAt = now();

  try {
    await checkDatabase();
    return jsonResponse(
      { status: "ok", db: "connected", latencyMs: Math.max(0, now() - startedAt), version },
      200,
    );
  } catch (error) {
    logError("api.health.db_unreachable", error);
    return jsonResponse({ status: "degraded", db: "unreachable" }, 503);
  }
}
