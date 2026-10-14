import { fail } from "../api/respond.ts";
import type { ClientRecord, ClientsRepository } from "../api/clients.server.ts";
import type { SessionContext } from "../auth/require-session.ts";

export const clientTenantId = "11111111-1111-4111-8111-111111111111";
export const clientRecordId = "33333333-3333-4333-8333-333333333333";
export const nextClientRecordId = "44444444-4444-4444-8444-444444444444";
export const validClientInput = {
  name: "Amina Traders",
  phone: "+254712345678",
  whatsapp: "+254712345678",
  email: "amina@example.test",
  country: "Kenya",
  city: "Nairobi",
  currency: "KES",
  source: "referral",
  notes: "Prefers WhatsApp contact",
};

export const clientRecord: ClientRecord = {
  id: clientRecordId,
  tenant_id: clientTenantId,
  name: "Amina Traders",
  phone: "+254712345678",
  whatsapp: "+254712345678",
  email: "amina@example.test",
  country: "Kenya",
  city: "Nairobi",
  currency: "KES",
  source: "referral",
  notes: "Prefers WhatsApp contact",
  deleted_at: null,
  created_at: "2026-10-14T12:00:00.000Z",
  updated_at: "2026-10-14T12:00:00.000Z",
};

export type ClientRepositoryCall = { operation: string; args: unknown[] };

export function createClientsTestHarness(overrides: Partial<ClientsRepository> = {}) {
  const calls: ClientRepositoryCall[] = [];
  const repository: ClientsRepository = {
    async findByPhone(...args) {
      calls.push({ operation: "findByPhone", args });
      return overrides.findByPhone ? overrides.findByPhone(...args) : null;
    },
    async create(...args) {
      calls.push({ operation: "create", args });
      return overrides.create ? overrides.create(...args) : { client: clientRecord, wasNew: true };
    },
    async list(...args) {
      calls.push({ operation: "list", args });
      return overrides.list
        ? overrides.list(...args)
        : { records: [clientRecord], nextCursor: null, total: 1 };
    },
    async get(...args) {
      calls.push({ operation: "get", args });
      return overrides.get ? overrides.get(...args) : clientRecord;
    },
    async update(...args) {
      calls.push({ operation: "update", args });
      return overrides.update ? overrides.update(...args) : clientRecord;
    },
    async softDelete(...args) {
      calls.push({ operation: "softDelete", args });
      return overrides.softDelete ? overrides.softDelete(...args) : true;
    },
  };
  const authenticate = async (request: Request): Promise<SessionContext> => {
    if (request.headers.get("authorization") !== "Bearer test-token") {
      throw fail("UNAUTHORIZED", "A valid bearer token is required.", 401);
    }
    return { userId: "user-1", tenantId: clientTenantId, email: "user@example.test" };
  };

  return { repository, authenticate, calls };
}

export function clientsApiRequest(
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

export function clientCall(calls: ClientRepositoryCall[], operation: string): ClientRepositoryCall {
  const call = calls.find((item) => item.operation === operation);
  if (!call) throw new Error(`Expected client repository call: ${operation}`);
  return call;
}
