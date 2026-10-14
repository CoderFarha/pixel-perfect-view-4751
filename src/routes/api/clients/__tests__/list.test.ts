import assert from "node:assert/strict";
import test from "node:test";
import { createClientsCollectionHandlers } from "../../../../lib/api/clients.server.ts";
import {
  clientCall,
  clientRecord,
  clientTenantId,
  clientsApiRequest,
  createClientsTestHarness,
  nextClientRecordId,
} from "../../../../lib/testing/clients-api-fixture.ts";

test("requires authentication", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: clientsApiRequest("/api/clients", { authorized: false }),
  });

  assert.equal(response.status, 401);
  assert.equal(harness.calls.length, 0);
});

test("passes authenticated tenant, limit, and cursor to the repository", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  await handlers.GET({
    request: clientsApiRequest("/api/clients?limit=1&cursor=44444444-4444-4444-8444-444444444444"),
  });

  assert.deepEqual(clientCall(harness.calls, "list").args, [clientTenantId, 1, nextClientRecordId]);
});

test("returns list records, cursor, and tenant-scoped total", async () => {
  const harness = createClientsTestHarness({
    async list() {
      return { records: [clientRecord], nextCursor: nextClientRecordId, total: 12 };
    },
  });
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({ request: clientsApiRequest("/api/clients?limit=1") });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: [clientRecord],
    nextCursor: nextClientRecordId,
    total: 12,
  });
});

test("rejects invalid pagination and unknown query parameters", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  for (const path of ["/api/clients?limit=0", "/api/clients?limit=101", "/api/clients?foo=bar"]) {
    const response = await handlers.GET({ request: clientsApiRequest(path) });
    assert.equal(response.status, 400);
  }
  assert.equal(harness.calls.length, 0);
});

test("rejects an invalid cursor", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: clientsApiRequest("/api/clients?cursor=not-a-uuid"),
  });

  assert.equal(response.status, 400);
  assert.equal(harness.calls.length, 0);
});
