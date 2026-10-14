import assert from "node:assert/strict";
import test from "node:test";
import { createSourcingCollectionHandlers } from "../../../../lib/api/sourcing.server.ts";
import {
  apiRequest,
  createSourcingTestHarness,
  cursorId,
  getCall,
  sampleRecord,
  tenantId,
} from "../../../../lib/testing/sourcing-api-fixture.ts";

test("missing auth returns 401", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: apiRequest("/api/sourcing", { authorized: false }),
  });

  assert.equal(response.status, 401);
  assert.equal(harness.calls.length, 0);
});

test("list passes status, limit, and cursor to the tenant-scoped repository", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  await handlers.GET({
    request: apiRequest(`/api/sourcing?status=RECEIVED&limit=10&cursor=${cursorId}`),
  });

  assert.deepEqual(getCall(harness.calls, "listRequests").args, [
    tenantId,
    { status: "RECEIVED", limit: 10, cursor: cursorId },
  ]);
});

test("list returns data, next cursor, and total count", async () => {
  const harness = createSourcingTestHarness({
    async listRequests() {
      return { records: [sampleRecord], nextCursor: sampleRecord.id, total: 21 };
    },
  });
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({ request: apiRequest("/api/sourcing?limit=1") });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: [sampleRecord],
    nextCursor: sampleRecord.id,
    total: 21,
  });
});

test("invalid status, pagination, and unknown query values return 400", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);

  for (const url of [
    "/api/sourcing?status=NOT_A_STATUS",
    "/api/sourcing?limit=101",
    "/api/sourcing?extra=value",
  ]) {
    const response = await handlers.GET({ request: apiRequest(url) });
    assert.equal(response.status, 400);
  }
  assert.equal(harness.calls.length, 0);
});

test("invalid cursor is rejected before querying records", async () => {
  const harness = createSourcingTestHarness();
  const handlers = createSourcingCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({ request: apiRequest("/api/sourcing?cursor=not-a-uuid") });

  assert.equal(response.status, 400);
  assert.equal(harness.calls.length, 0);
});
