import assert from "node:assert/strict";
import test from "node:test";
import { createSourcingCollectionHandlers } from "../../../../lib/api/sourcing.server.ts";
import {
  apiRequest,
  clientId,
  createSourcingTestHarness,
  getCall,
  sourcingId,
  tenantId,
  validCreateInput,
} from "../../../../lib/testing/sourcing-api-fixture.ts";

test("missing auth returns 401 and does not call the repository", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: apiRequest("/api/sourcing", {
      method: "POST",
      body: validCreateInput,
      authorized: false,
    }),
  });

  assert.equal(response.status, 401);
  assert.equal(harness.calls.length, 0);
});

test("invalid or non-strict input returns detailed 400 errors", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: apiRequest("/api/sourcing", {
      method: "POST",
      body: { ...validCreateInput, unexpected: true },
    }),
  });
  const body: unknown = await response.json();

  assert.equal(response.status, 400);
  assert.equal(typeof body, "object");
  assert.notEqual(body, null);
  if (typeof body !== "object" || body === null || !("error" in body)) {
    assert.fail("Expected validation error details.");
  }
  assert.equal(typeof body.error, "object");
});

test("valid request creates a client and returns the required response shape", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: apiRequest("/api/sourcing", { method: "POST", body: validCreateInput }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: {
      sourcingId,
      clientId,
      requestCode: "SR-2026-0001",
      clientWasNew: true,
    },
  });
  assert.deepEqual(getCall(harness.calls, "generateCode").args, [tenantId]);
});

test("existing phone reuses the client instead of creating a duplicate", async () => {
  const harness = createSourcingTestHarness({
    async findClientByPhone() {
      return { id: clientId };
    },
  });
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: apiRequest("/api/sourcing", { method: "POST", body: validCreateInput }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: {
      sourcingId,
      clientId,
      requestCode: "SR-2026-0001",
      clientWasNew: false,
    },
  });
  assert.equal(
    harness.calls.some((call) => call.operation === "createClient"),
    false,
  );
});

test("reports a client created by a concurrent request as reused", async () => {
  const harness = createSourcingTestHarness({
    async createClient() {
      return { id: clientId, wasNew: false };
    },
  });
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: apiRequest("/api/sourcing", { method: "POST", body: validCreateInput }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: {
      sourcingId,
      clientId,
      requestCode: "SR-2026-0001",
      clientWasNew: false,
    },
  });
});

test("client matching and creation are scoped to the authenticated tenant", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  await handlers.POST({
    request: apiRequest("/api/sourcing", { method: "POST", body: validCreateInput }),
  });

  assert.equal(getCall(harness.calls, "findClientByPhone").args[0], tenantId);
  assert.equal(getCall(harness.calls, "createClient").args[0], tenantId);
  assert.equal(getCall(harness.calls, "createRequest").args[0], tenantId);
});

test("malformed JSON returns 400 instead of a server error", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: new Request("https://tradehub.test/api/sourcing", {
      method: "POST",
      headers: { authorization: "Bearer test-token", "content-type": "application/json" },
      body: "{",
    }),
  });

  assert.equal(response.status, 400);
});
