import { fail } from "../api/respond.ts";
import type { SessionContext } from "../auth/require-session.ts";
import type { SourcingRecord, SourcingRepository } from "../api/sourcing.server.ts";

export const tenantId = "11111111-1111-4111-8111-111111111111";
export const otherTenantId = "22222222-2222-4222-8222-222222222222";
export const clientId = "33333333-3333-4333-8333-333333333333";
export const sourcingId = "44444444-4444-4444-8444-444444444444";
export const cursorId = "55555555-5555-4555-8555-555555555555";

export const validCreateInput = {
  source: "whatsapp",
  productImages: ["https://storage.example/products/item.jpg"],
  client: { phone: "+254712345678" },
  product: { description: "Wireless noise-cancelling headphones", quantity: 200 },
};

export const sampleRecord: SourcingRecord = {
  id: sourcingId,
  tenant_id: tenantId,
  request_code: "SR-2026-0001",
  client_id: clientId,
  raw_message: "Wireless noise-cancelling headphones",
  client_images: ["https://storage.example/products/item.jpg"],
  screenshots: [],
  source: "whatsapp",
  quantity: 200,
  unit: "pieces",
  destination: "Kenya",
  target_price_cny: null,
  category: null,
  deadline: null,
  requirements: null,
  source_notes: null,
  status: "RECEIVED",
  created_at: "2026-10-14T12:00:00.000Z",
  updated_at: "2026-10-14T12:00:00.000Z",
};

export type RepositoryCall = { operation: string; args: unknown[] };

export function createSourcingTestHarness(overrides: Partial<SourcingRepository> = {}) {
  const calls: RepositoryCall[] = [];
  const repository: SourcingRepository = {
    async findClientByPhone(...args) {
      calls.push({ operation: "findClientByPhone", args });
      return overrides.findClientByPhone ? overrides.findClientByPhone(...args) : null;
    },
    async createClient(...args) {
      calls.push({ operation: "createClient", args });
      return overrides.createClient
        ? overrides.createClient(...args)
        : { id: clientId, wasNew: true };
    },
    async generateCode(...args) {
      calls.push({ operation: "generateCode", args });
      return overrides.generateCode ? overrides.generateCode(...args) : "SR-2026-0001";
    },
    async createRequest(...args) {
      calls.push({ operation: "createRequest", args });
      return overrides.createRequest ? overrides.createRequest(...args) : { id: sourcingId };
    },
    async listRequests(...args) {
      calls.push({ operation: "listRequests", args });
      return overrides.listRequests
        ? overrides.listRequests(...args)
        : { records: [], nextCursor: null, total: 0 };
    },
    async getRequest(...args) {
      calls.push({ operation: "getRequest", args });
      return overrides.getRequest ? overrides.getRequest(...args) : sampleRecord;
    },
    async updateRequest(...args) {
      calls.push({ operation: "updateRequest", args });
      return overrides.updateRequest ? overrides.updateRequest(...args) : sampleRecord;
    },
    async softDeleteRequest(...args) {
      calls.push({ operation: "softDeleteRequest", args });
      return overrides.softDeleteRequest ? overrides.softDeleteRequest(...args) : true;
    },
  };
  const authenticate = async (request: Request): Promise<SessionContext> => {
    if (request.headers.get("authorization") !== "Bearer test-token") {
      throw fail("UNAUTHORIZED", "A valid bearer token is required.", 401);
    }
    return { userId: "user-1", tenantId, email: "user@example.test" };
  };

  return { repository, authenticate, calls };
}

export function apiRequest(
  path: string,
  options: { method?: string; body?: unknown; authorized?: boolean } = {},
): Request {
  const headers = new Headers();
  if (options.authorized !== false) headers.set("authorization", "Bearer test-token");
  if (options.body !== undefined) headers.set("content-type", "application/json");
  return new Request(`https://tradehub.test${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

export async function responseJson(response: Response): Promise<unknown> {
  return response.json();
}

export function getCall(calls: RepositoryCall[], operation: string): RepositoryCall {
  const call = calls.find((item) => item.operation === operation);
  if (!call) throw new Error(`Expected repository call: ${operation}`);
  return call;
}
