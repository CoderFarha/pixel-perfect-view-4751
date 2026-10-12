import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { fail, handleError, ok } from "../respond.ts";

test("ok returns the data envelope and requested status", async () => {
  const response = ok({ id: "record-1" }, 201);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { id: "record-1" } });
});

test("fail returns the error envelope and status", async () => {
  const response = fail("NOT_FOUND", "Record not found.", 404);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: "NOT_FOUND", message: "Record not found." },
  });
});

test("handleError converts Zod errors to a detailed 400 response", async () => {
  const result = z.object({ name: z.string() }).safeParse({ name: 4 });
  assert.equal(result.success, false);
  if (result.success) return;

  const response = handleError(result.error, "validation-test");
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "VALIDATION",
      message: "Request validation failed.",
      details: [
        { code: "invalid_type", message: "Expected string, received number", path: "name" },
      ],
    },
  });
});

test("handleError passes through Response errors unchanged", () => {
  const original = new Response("unauthorized", { status: 401 });
  assert.equal(handleError(original), original);
});

test("handleError returns a generic 500 for unknown errors", async () => {
  const originalError = console.error;
  console.error = () => undefined;
  try {
    const response = handleError(new Error("database detail"), "respond-test");
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: { code: "INTERNAL", message: "An unexpected error occurred." },
    });
  } finally {
    console.error = originalError;
  }
});
