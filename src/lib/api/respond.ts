import { ZodError } from "zod";
import { logError, logWarning } from "../logger.ts";

type ErrorDetails = readonly {
  code: string;
  message: string;
  path: string;
}[];

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function ok<T>(data: T, status = 200): Response {
  return jsonResponse({ data }, status);
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: ErrorDetails,
): Response {
  return jsonResponse({ error: { code, message, ...(details ? { details } : {}) } }, status);
}

export function handleError(error: unknown, context = "api"): Response {
  if (error instanceof Response) return error;

  if (error instanceof ZodError) {
    logWarning(`${context}.validation_failed`);
    const details = error.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      path: issue.path.map(String).join("."),
    }));
    return fail("VALIDATION", "Request validation failed.", 400, details);
  }

  logError(`${context}.unexpected_error`, error);
  return fail("INTERNAL", "An unexpected error occurred.", 500);
}
