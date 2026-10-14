import assert from "node:assert/strict";
import test from "node:test";
import { createSourcingIdHandlers } from "../../../../lib/api/sourcing.server.ts";
import {
  apiRequest,
  createSourcingTestHarness,
  getCall,
  sampleRecord,
  sourcingId,
  tenantId,
} from "../../../../lib/testing/sourcing-api-fixture.ts";

test("missing auth returns 401", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: apiRequest(`/api/sourcing/${sourcingId}`, { authorized: false }),
    params: { id: sourcingId },
  });

  assert.equal(response.status, 401);
  assert.equal(harness.calls.length, 0);
});

test("not found and cross-tenant records both return 404", async () => {
  const harness = createSourcingTestHarness({
    async getRequest() {
      return null;
    },
  });
  const handlers = createSourcingIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: apiRequest(`/api/sourcing/${sourcingId}`),
    params: { id: sourcingId },
  });

  assert.equal(response.status, 404);
  assert.equal(getCall(harness.calls, "getRequest").args[0], tenantId);
});

test("fetch returns the tenant-scoped record", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: apiRequest(`/api/sourcing/${sourcingId}`),
    params: { id: sourcingId },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: sampleRecord });
  assert.deepEqual(getCall(harness.calls, "getRequest").args, [tenantId, sourcingId]);
});

test("invalid path id returns 400 without querying", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: apiRequest("/api/sourcing/not-a-uuid"),
    params: { id: "not-a-uuid" },
  });

  assert.equal(response.status, 400);
  assert.equal(harness.calls.length, 0);
});

test("patch rejects unknown and empty fields", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingIdHandlers(harness.repository, harness.authenticate);
  for (const body of [{ unsupported: true }, {}]) {
    const response = await handlers.PATCH({
      request: apiRequest(`/api/sourcing/${sourcingId}`, { method: "PATCH", body }),
      params: { id: sourcingId },
    });
    assert.equal(response.status, 400);
  }
  assert.equal(harness.calls.length, 0);
});

test("patch allows only validated update fields and scopes to tenant", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.PATCH({
    request: apiRequest(`/api/sourcing/${sourcingId}`, {
      method: "PATCH",
      body: { status: "RFQ_SENT", quantity: 30, category: "Electronics" },
    }),
    params: { id: sourcingId },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(getCall(harness.calls, "updateRequest").args, [
    tenantId,
    sourcingId,
    { status: "RFQ_SENT", quantity: 30, category: "Electronics" },
  ]);
});

test("patch returns 404 for records outside the tenant", async () => {
  const harness = createSourcingTestHarness({
    async updateRequest() {
      return null;
    },
  });
  const handlers = createSourcingIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.PATCH({
    request: apiRequest(`/api/sourcing/${sourcingId}`, {
      method: "PATCH",
      body: { status: "RFQ_SENT" },
    }),
    params: { id: sourcingId },
  });

  assert.equal(response.status, 404);
  assert.equal(getCall(harness.calls, "updateRequest").args[0], tenantId);
});

test("delete is tenant-scoped and invokes soft delete", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.DELETE({
    request: apiRequest(`/api/sourcing/${sourcingId}`, { method: "DELETE" }),
    params: { id: sourcingId },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { deleted: true } });
  assert.deepEqual(getCall(harness.calls, "softDeleteRequest").args, [tenantId, sourcingId]);
});

test("delete returns 404 for records outside the tenant", async () => {
  const harness = createSourcingTestHarness({
    async softDeleteRequest() {
      return false;
    },
  });
  const handlers = createSourcingIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.DELETE({
    request: apiRequest(`/api/sourcing/${sourcingId}`, { method: "DELETE" }),
    params: { id: sourcingId },
  });

  assert.equal(response.status, 404);
  assert.equal(getCall(harness.calls, "softDeleteRequest").args[0], tenantId);
});
