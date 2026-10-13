import assert from "node:assert/strict";
import test from "node:test";
import { createRequireSession } from "../require-session.ts";
import { mockSession } from "../../testing/mock-session.ts";

function request(headers?: Headers): Request {
  return new Request("https://tradehub.test/api/example", headers ? { headers } : undefined);
}

async function responseFrom(promise: Promise<unknown>): Promise<Response> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof Response);
    return error;
  }
  assert.fail("Expected session validation to reject the request.");
}

test("missing authorization header returns 401", async () => {
  const requireSession = createRequireSession(async () => null);
  const response = await responseFrom(requireSession(request()));
  assert.equal(response.status, 401);
});

test("invalid access token returns 401", async () => {
  const requireSession = createRequireSession(async () => null);
  const response = await responseFrom(
    requireSession(request(new Headers({ authorization: "Bearer invalid-token" }))),
  );
  assert.equal(response.status, 401);
});

test("valid user without tenant metadata returns 403", async () => {
  const requireSession = createRequireSession(async () => ({ id: "user-1", app_metadata: {} }));
  const response = await responseFrom(
    requireSession(request(new Headers({ authorization: "Bearer valid-token" }))),
  );
  assert.equal(response.status, 403);
});

test("valid tenant session returns user and tenant context", async () => {
  const headers = mockSession("tenant-1", "user-1");
  const requireSession = createRequireSession(async (token) => {
    const encodedPayload = token.startsWith("test-session.") ? token.slice(13) : "";
    const payload: unknown = JSON.parse(atob(encodedPayload));
    assert.equal(typeof payload, "object");
    assert.notEqual(payload, null);
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("tenantId" in payload) ||
      !("userId" in payload)
    ) {
      return null;
    }
    return {
      id: String(payload.userId),
      app_metadata: { tenant_id: String(payload.tenantId) },
    };
  });

  assert.deepEqual(await requireSession(request(headers)), {
    userId: "user-1",
    tenantId: "tenant-1",
    email: "",
  });
});
