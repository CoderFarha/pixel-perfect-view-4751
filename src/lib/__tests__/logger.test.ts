import assert from "node:assert/strict";
import test from "node:test";
import { logError } from "../logger.ts";

test("logError emits structured metadata without error messages or stacks", () => {
  const originalError = console.error;
  const entries: string[] = [];
  console.error = (entry?: unknown) => entries.push(String(entry));

  try {
    logError(
      "test.failure",
      new Error("Client name: Amani Electronics, phone: +254712345678, email: client@example.test"),
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(entries.length, 1);
  assert.deepEqual(JSON.parse(entries[0] ?? ""), {
    level: "error",
    event: "test.failure",
    fields: { isError: 1 },
  });
  assert.doesNotMatch(entries[0] ?? "", /Amani|254712345678|client@example\.test/);
});
