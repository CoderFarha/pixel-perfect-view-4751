import { z } from "zod";
import { requireSession, type SessionContext } from "../auth/require-session.ts";
import type { Database } from "../supabase/database.types.ts";
import { fail, handleError, ok } from "./respond.ts";

export const createClientInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(10),
    whatsapp: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    country: z.string().trim().min(1),
    city: z.string().trim().min(1).optional(),
    currency: z.string().trim().min(1),
    source: z.string().trim().min(1).optional(),
    notes: z.string().trim().optional(),
  })
  .strict();

export const updateClientInputSchema = createClientInputSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const clientsListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().uuid().optional(),
  })
  .strict();

export type ClientInput = z.infer<typeof createClientInputSchema>;
export type ClientRecord = {
  id: string;
  tenant_id: string;
  name: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  currency: string | null;
  source: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
export type ClientPage = {
  records: ClientRecord[];
  nextCursor: string | null;
  total: number;
};

export type ClientsRepository = {
  findByPhone(tenantId: string, phone: string): Promise<ClientRecord | null>;
  create(tenantId: string, input: ClientInput): Promise<{ client: ClientRecord; wasNew: boolean }>;
  list(tenantId: string, limit: number, cursor?: string): Promise<ClientPage>;
  get(tenantId: string, id: string): Promise<ClientRecord | null>;
  update(
    tenantId: string,
    id: string,
    input: z.infer<typeof updateClientInputSchema>,
  ): Promise<ClientRecord | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
};

type Authenticate = (request: Request) => Promise<SessionContext>;
type ClientHandlerContext = { request: Request; params?: { id: string } };

const clientColumns =
  "id, tenant_id, name, phone, whatsapp, email, country, city, currency, source, notes, deleted_at, created_at, updated_at";
const clientRecordSchema: z.ZodType<ClientRecord> = z
  .object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    name: z.string().nullable(),
    phone: z.string(),
    whatsapp: z.string().nullable(),
    email: z.string().nullable(),
    country: z.string().nullable(),
    city: z.string().nullable(),
    currency: z.string().nullable(),
    source: z.string().nullable(),
    notes: z.string().nullable(),
    deleted_at: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .strict();
const idSchema = z.string().uuid();

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw fail("INVALID_JSON", "Request body must be valid JSON.", 400);
    }
    throw error;
  }
}

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function parseRecord(value: unknown): ClientRecord {
  return clientRecordSchema.parse(value);
}

export function createClientsCollectionHandlers(
  repository: ClientsRepository,
  authenticate: Authenticate = requireSession,
) {
  return {
    POST: async ({ request }: ClientHandlerContext): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const input = createClientInputSchema.parse(await readJson(request));
        const matched = await repository.findByPhone(session.tenantId, input.phone);
        const result = matched
          ? { client: matched, wasNew: false }
          : await repository.create(session.tenantId, input);
        return ok(
          { client: result.client, clientWasNew: result.wasNew },
          result.wasNew ? 201 : 200,
        );
      } catch (error) {
        return handleError(error, "api.clients.create");
      }
    },
    GET: async ({ request }: ClientHandlerContext): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const query = clientsListQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        );
        const page = await repository.list(session.tenantId, query.limit, query.cursor);
        return json({ data: page.records, nextCursor: page.nextCursor, total: page.total });
      } catch (error) {
        return handleError(error, "api.clients.list");
      }
    },
  };
}

export function createClientIdHandlers(
  repository: ClientsRepository,
  authenticate: Authenticate = requireSession,
) {
  return {
    GET: async ({ request, params }: ClientHandlerContext): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const id = idSchema.parse(params?.id);
        const client = await repository.get(session.tenantId, id);
        if (!client) throw fail("NOT_FOUND", "Client not found.", 404);
        return ok(client);
      } catch (error) {
        return handleError(error, "api.clients.get");
      }
    },
    PATCH: async ({ request, params }: ClientHandlerContext): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const id = idSchema.parse(params?.id);
        const input = updateClientInputSchema.parse(await readJson(request));
        const client = await repository.update(session.tenantId, id, input);
        if (!client) throw fail("NOT_FOUND", "Client not found.", 404);
        return ok(client);
      } catch (error) {
        return handleError(error, "api.clients.update");
      }
    },
    DELETE: async ({ request, params }: ClientHandlerContext): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const id = idSchema.parse(params?.id);
        const deleted = await repository.softDelete(session.tenantId, id);
        if (!deleted) throw fail("NOT_FOUND", "Client not found.", 404);
        return ok({ deleted: true });
      } catch (error) {
        return handleError(error, "api.clients.delete");
      }
    },
  };
}

export function createClientsRepository(
  getClient: () => ReturnType<typeof import("../supabase/admin.ts").getAdminClient>,
): ClientsRepository {
  return {
    async findByPhone(tenantId, phone) {
      const { data, error } = await getClient()
        .from("clients")
        .select(clientColumns)
        .eq("tenant_id", tenantId)
        .eq("phone", phone)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data ? parseRecord(data) : null;
    },
    async create(tenantId, input) {
      const { data, error } = await getClient()
        .from("clients")
        .insert({
          tenant_id: tenantId,
          name: input.name ?? null,
          phone: input.phone,
          whatsapp: input.whatsapp ?? null,
          email: input.email ?? null,
          country: input.country,
          city: input.city ?? null,
          currency: input.currency,
          source: input.source ?? null,
          notes: input.notes ?? null,
        })
        .select(clientColumns)
        .single();
      if (error) {
        if (error.code === "23505") {
          const concurrentClient = await this.findByPhone(tenantId, input.phone);
          if (concurrentClient) return { client: concurrentClient, wasNew: false };
          throw fail("CONFLICT", "A client with this phone already exists.", 409);
        }
        throw error;
      }
      return { client: parseRecord(data), wasNew: true };
    },
    async list(tenantId, limit, cursor) {
      const countQuery = getClient()
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      let query = getClient()
        .from("clients")
        .select(clientColumns)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);
      if (cursor) query = query.gt("id", cursor);
      const { data, error } = await query.order("id", { ascending: true }).limit(limit + 1);
      if (error) throw error;
      const records = z.array(clientRecordSchema).parse(data);
      const hasMore = records.length > limit;
      const pageRecords = records.slice(0, limit);
      return {
        records: pageRecords,
        nextCursor: hasMore ? (pageRecords.at(-1)?.id ?? null) : null,
        total: count ?? 0,
      };
    },
    async get(tenantId, id) {
      const { data, error } = await getClient()
        .from("clients")
        .select(clientColumns)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data ? parseRecord(data) : null;
    },
    async update(tenantId, id, input) {
      const update: Database["public"]["Tables"]["clients"]["Update"] = {
        updated_at: new Date().toISOString(),
      };
      if (input.name !== undefined) update.name = input.name;
      if (input.phone !== undefined) update.phone = input.phone;
      if (input.whatsapp !== undefined) update.whatsapp = input.whatsapp;
      if (input.email !== undefined) update.email = input.email;
      if (input.country !== undefined) update.country = input.country;
      if (input.city !== undefined) update.city = input.city;
      if (input.currency !== undefined) update.currency = input.currency;
      if (input.source !== undefined) update.source = input.source;
      if (input.notes !== undefined) update.notes = input.notes;

      const { data, error } = await getClient()
        .from("clients")
        .update(update)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .select(clientColumns)
        .maybeSingle();
      if (error?.code === "23505") {
        throw fail("CONFLICT", "A client with this phone already exists.", 409);
      }
      if (error) throw error;
      return data ? parseRecord(data) : null;
    },
    async softDelete(tenantId, id) {
      const timestamp = new Date().toISOString();
      const { data, error } = await getClient()
        .from("clients")
        .update({ deleted_at: timestamp, updated_at: timestamp })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
  };
}
