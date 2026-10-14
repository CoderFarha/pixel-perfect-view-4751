import assert from "node:assert/strict";
import test from "node:test";
import { getHealthResponse } from "../../../lib/api/health.ts";

test("returns healthy status and version when the database is reachable", async () => {
  const response = await getHealthResponse(
    async () => undefined,
    () => 100,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    db: "connected",
    latencyMs: 0,
    version: "2026-10-14",
  });
});

test("reports elapsed database-check latency", async () => {
  let currentTime = 100;
  const response = await getHealthResponse(
    async () => undefined,
    () => {
      currentTime += 12;
      return currentTime;
    },
  );

  const body: unknown = await response.json();
  assert.equal(typeof body, "object");
  assert.notEqual(body, null);
  if (typeof body !== "object" || body === null || !("latencyMs" in body)) {
    assert.fail("Expected a health response with latency.");
  }
  assert.equal(body.latencyMs, 12);
});

test("reports degraded status when the database check fails", async () => {
  const response = await getHealthResponse(async () => {
    throw new Error("database details must not be returned");
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "degraded", db: "unreachable" });
});

test("logs database failures without including error details in the response", async () => {
  const originalError = console.error;
  const logged: string[] = [];
  console.error = (message?: unknown) => logged.push(String(message));

  try {
    const response = await getHealthResponse(async () => {
      throw new Error("private database detail");
    });

    assert.equal(response.status, 503);
    assert.match(logged.join("\n"), /api\.health\.db_unreachable/);
    assert.doesNotMatch(logged.join("\n"), /private database detail/);
    assert.doesNotMatch(JSON.stringify(await response.json()), /private database detail/);
  } finally {
    console.error = originalError;
  }
});
