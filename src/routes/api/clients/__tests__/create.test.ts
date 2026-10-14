import assert from "node:assert/strict";
import test from "node:test";
import { createClientsCollectionHandlers } from "../../../../lib/api/clients.server.ts";
import {
  clientCall,
  clientRecord,
  clientRecordId,
  clientTenantId,
  clientsApiRequest,
  createClientsTestHarness,
  validClientInput,
} from "../../../../lib/testing/clients-api-fixture.ts";

test("requires authentication before looking up a client", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: clientsApiRequest("/api/clients", {
      method: "POST",
      body: validClientInput,
      authorized: false,
    }),
  });

  assert.equal(response.status, 401);
  assert.equal(harness.calls.length, 0);
});

test("rejects malformed, incomplete, and unknown input fields", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  for (const body of [
    { ...validClientInput, extra: true },
    { ...validClientInput, phone: "123" },
    { ...validClientInput, email: "not-an-email" },
  ]) {
    const response = await handlers.POST({
      request: clientsApiRequest("/api/clients", { method: "POST", body }),
    });
    assert.equal(response.status, 400);
  }
  assert.equal(harness.calls.length, 0);
});

test("creates a tenant-scoped client and returns clientWasNew", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: clientsApiRequest("/api/clients", { method: "POST", body: validClientInput }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: { client: clientRecord, clientWasNew: true },
  });
  assert.deepEqual(clientCall(harness.calls, "findByPhone").args, [
    clientTenantId,
    validClientInput.phone,
  ]);
  assert.deepEqual(clientCall(harness.calls, "create").args, [clientTenantId, validClientInput]);
});

test("returns a matching tenant client without creating a duplicate", async () => {
  const harness = createClientsTestHarness({
    async findByPhone() {
      return clientRecord;
    },
  });
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: clientsApiRequest("/api/clients", { method: "POST", body: validClientInput }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { client: clientRecord, clientWasNew: false },
  });
  assert.equal(
    harness.calls.some((call) => call.operation === "create"),
    false,
  );
});

test("returns existing client if concurrent creation wins the unique phone constraint", async () => {
  const harness = createClientsTestHarness({
    async create() {
      return { client: clientRecord, wasNew: false };
    },
  });
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: clientsApiRequest("/api/clients", { method: "POST", body: validClientInput }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { client: clientRecord, clientWasNew: false },
  });
  assert.equal(clientCall(harness.calls, "create").args[0], clientTenantId);
});

test("client output never reports any other tenant data", async () => {
  const harness = createClientsTestHarness({
    async findByPhone(tenantId) {
      assert.equal(tenantId, clientTenantId);
      return null;
    },
    async create(tenantId) {
      assert.equal(tenantId, clientTenantId);
      return { client: { ...clientRecord, id: clientRecordId, tenant_id: tenantId }, wasNew: true };
    },
  });
  const handlers = createClientsCollectionHandlers(harness.repository, harness.authenticate);
  const response = await handlers.POST({
    request: clientsApiRequest("/api/clients", { method: "POST", body: validClientInput }),
  });

  assert.equal(response.status, 201);
  assert.equal(clientCall(harness.calls, "create").args[0], clientTenantId);
});
