import assert from "node:assert/strict";
import test from "node:test";
import { createClientIdHandlers } from "../../../../lib/api/clients.server.ts";
import {
  clientCall,
  clientRecord,
  clientRecordId,
  clientTenantId,
  clientsApiRequest,
  createClientsTestHarness,
} from "../../../../lib/testing/clients-api-fixture.ts";

test("requires authentication for detail routes", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: clientsApiRequest(`/api/clients/${clientRecordId}`, { authorized: false }),
    params: { id: clientRecordId },
  });

  assert.equal(response.status, 401);
  assert.equal(harness.calls.length, 0);
});

test("returns a client scoped to the authenticated tenant", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: clientsApiRequest(`/api/clients/${clientRecordId}`),
    params: { id: clientRecordId },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: clientRecord });
  assert.deepEqual(clientCall(harness.calls, "get").args, [clientTenantId, clientRecordId]);
});

test("hides missing and cross-tenant clients as 404", async () => {
  const harness = createClientsTestHarness({
    async get() {
      return null;
    },
  });
  const handlers = createClientIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.GET({
    request: clientsApiRequest(`/api/clients/${clientRecordId}`),
    params: { id: clientRecordId },
  });

  assert.equal(response.status, 404);
  assert.equal(clientCall(harness.calls, "get").args[0], clientTenantId);
});

test("patch strictly validates allowed fields and tenant-scopes updates", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.PATCH({
    request: clientsApiRequest(`/api/clients/${clientRecordId}`, {
      method: "PATCH",
      body: { name: "Amina Imports", city: "Mombasa" },
    }),
    params: { id: clientRecordId },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(clientCall(harness.calls, "update").args, [
    clientTenantId,
    clientRecordId,
    { name: "Amina Imports", city: "Mombasa" },
  ]);
});

test("patch rejects empty and unknown field sets", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientIdHandlers(harness.repository, harness.authenticate);
  for (const body of [{}, { tenant_id: "other-tenant" }]) {
    const response = await handlers.PATCH({
      request: clientsApiRequest(`/api/clients/${clientRecordId}`, { method: "PATCH", body }),
      params: { id: clientRecordId },
    });
    assert.equal(response.status, 400);
  }
  assert.equal(harness.calls.length, 0);
});

test("patch returns 404 when client is cross-tenant", async () => {
  const harness = createClientsTestHarness({
    async update() {
      return null;
    },
  });
  const handlers = createClientIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.PATCH({
    request: clientsApiRequest(`/api/clients/${clientRecordId}`, {
      method: "PATCH",
      body: { city: "Mombasa" },
    }),
    params: { id: clientRecordId },
  });

  assert.equal(response.status, 404);
  assert.equal(clientCall(harness.calls, "update").args[0], clientTenantId);
});

test("delete soft-deletes the scoped client", async () => {
  const harness = createClientsTestHarness();
  const handlers = createClientIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.DELETE({
    request: clientsApiRequest(`/api/clients/${clientRecordId}`, { method: "DELETE" }),
    params: { id: clientRecordId },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { deleted: true } });
  assert.deepEqual(clientCall(harness.calls, "softDelete").args, [clientTenantId, clientRecordId]);
});

test("delete returns 404 for clients outside the current tenant", async () => {
  const harness = createClientsTestHarness({
    async softDelete() {
      return false;
    },
  });
  const handlers = createClientIdHandlers(harness.repository, harness.authenticate);
  const response = await handlers.DELETE({
    request: clientsApiRequest(`/api/clients/${clientRecordId}`, { method: "DELETE" }),
    params: { id: clientRecordId },
  });

  assert.equal(response.status, 404);
  assert.equal(clientCall(harness.calls, "softDelete").args[0], clientTenantId);
});
