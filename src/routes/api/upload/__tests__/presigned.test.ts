import assert from "node:assert/strict";
import test from "node:test";
import { createPresignedUploadHandler } from "../../../../lib/api/upload.server.ts";
import { fail } from "../../../../lib/api/respond.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const validInput = {
  filename: "product-photo.png",
  contentType: "image/png",
  folder: "products",
};

function uploadRequest(body: unknown, authorized = true, path = "/api/upload/presigned"): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (authorized) headers.set("authorization", "Bearer test-token");
  return new Request(`https://tradehub.test${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function uploadHarness() {
  const keys: string[] = [];
  const provider = {
    async createSignedUploadUrl(key: string) {
      keys.push(key);
      return {
        uploadUrl: `https://storage.example/signed/${key}`,
        publicUrl: `https://storage.example/public/${key}`,
      };
    },
  };
  const authenticate = async (request: Request) => {
    if (request.headers.get("authorization") !== "Bearer test-token") {
      throw fail("UNAUTHORIZED", "A valid bearer token is required.", 401);
    }
    return { userId: "user-1", tenantId, email: "user@example.test" };
  };
  const handler = createPresignedUploadHandler(
    provider,
    authenticate,
    () => new Date("2026-10-14T12:00:00.000Z"),
    () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  );
  return { handler, keys };
}

test("requires authentication", async () => {
  const { handler, keys } = uploadHarness();
  const response = await handler({
    request: uploadRequest(validInput, false),
  });

  assert.equal(response.status, 401);
  assert.equal(keys.length, 0);
});

test("rejects unsupported content types", async () => {
  const { handler, keys } = uploadHarness();
  const response = await handler({
    request: uploadRequest({ ...validInput, contentType: "application/pdf" }),
  });

  assert.equal(response.status, 400);
  assert.equal(keys.length, 0);
});

test("rejects traversal filenames and overly long names", async () => {
  const { handler, keys } = uploadHarness();
  for (const filename of ["../secret.png", "nested/file.png", "x".repeat(200)]) {
    const response = await handler({
      request: uploadRequest({ ...validInput, filename }),
    });
    assert.equal(response.status, 400);
  }
  assert.equal(keys.length, 0);
});

test("rejects unknown fields and invalid folders", async () => {
  const { handler, keys } = uploadHarness();
  for (const body of [
    { ...validInput, folder: "private" },
    { ...validInput, extra: true },
  ]) {
    const response = await handler({ request: uploadRequest(body) });
    assert.equal(response.status, 400);
  }
  assert.equal(keys.length, 0);
});

test("creates tenant-scoped key with UTC month and content-derived extension", async () => {
  const { handler, keys } = uploadHarness();
  const response = await handler({ request: uploadRequest(validInput) });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: {
      uploadUrl:
        "https://storage.example/signed/11111111-1111-4111-8111-111111111111/products/2026-10/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png",
      key: "11111111-1111-4111-8111-111111111111/products/2026-10/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png",
      publicUrl:
        "https://storage.example/public/11111111-1111-4111-8111-111111111111/products/2026-10/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png",
    },
  });
  assert.equal(keys[0], `${tenantId}/products/2026-10/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png`);
});

test("supports only the approved folder names and image formats", async () => {
  const { handler, keys } = uploadHarness();
  for (const [folder, contentType, ext] of [
    ["screenshots", "image/jpeg", "jpg"],
    ["products", "image/png", "png"],
    ["proofs", "image/webp", "webp"],
    ["proofs", "image/avif", "avif"],
  ]) {
    const response = await handler({
      request: uploadRequest({ ...validInput, folder, contentType }),
    });
    assert.equal(response.status, 200);
    assert.match(keys.at(-1) ?? "", new RegExp(`\\.${ext}$`));
  }
});
