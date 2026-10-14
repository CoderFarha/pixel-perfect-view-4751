import { z } from "zod";
import { handleError, fail, ok } from "./respond.ts";
import { requireSession, type SessionContext } from "../auth/require-session.ts";
import type { Database } from "../supabase/database.types.ts";

const sourcingStatusSchema = z.enum([
  "RECEIVED",
  "ANALYZING",
  "RFQ_SENT",
  "QUOTES_RECEIVED",
  "CLIENT_QUOTED",
  "ORDERED",
  "CANCELLED",
]);

const clientInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(10),
    whatsapp: z.string().trim().optional(),
    country: z.string().trim().min(1).default("Kenya"),
    city: z.string().trim().optional(),
    currency: z.string().trim().min(1).default("KES"),
  })
  .strict();

const productInputSchema = z
  .object({
    description: z.string().trim().min(10),
    category: z.string().trim().optional(),
    quantity: z.number().int().positive(),
    unit: z.string().trim().min(1).default("pieces"),
    targetPriceCny: z.number().positive().optional(),
    deadline: z.string().date().optional(),
    requirements: z.string().trim().optional(),
  })
  .strict();

export const createSourcingInputSchema = z
  .object({
    source: z.enum(["whatsapp", "call", "in-person", "email", "referral", "other"]),
    screenshots: z.array(z.string().url()).default([]),
    productImages: z.array(z.string().url()).min(1),
    client: clientInputSchema,
    product: productInputSchema,
    sourceNotes: z.string().trim().optional(),
  })
  .strict();

export const updateSourcingInputSchema = z
  .object({
    source: z.enum(["whatsapp", "call", "in-person", "email", "referral", "other"]).optional(),
    screenshots: z.array(z.string().url()).optional(),
    productImages: z.array(z.string().url()).min(1).optional(),
    sourceNotes: z.string().trim().optional(),
    status: sourcingStatusSchema.optional(),
    quantity: z.number().int().positive().optional(),
    category: z.string().trim().optional(),
    targetPriceCny: z.number().positive().optional(),
    deadline: z.string().date().optional(),
    requirements: z.string().trim().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const sourcingListQuerySchema = z
  .object({
    status: sourcingStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().uuid().optional(),
  })
  .strict();

export type CreateSourcingInput = z.infer<typeof createSourcingInputSchema>;
export type UpdateSourcingInput = z.infer<typeof updateSourcingInputSchema>;
export type SourcingRecord = {
  id: string;
  tenant_id: string;
  request_code: string;
  client_id: string | null;
  raw_message: string | null;
  client_images: string[];
  screenshots: string[];
  source: string | null;
  quantity: number | null;
  unit: string | null;
  destination: string | null;
  target_price_cny: number | null;
  category: string | null;
  deadline: string | null;
  requirements: string | null;
  source_notes: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SourcingPage = {
  records: SourcingRecord[];
  nextCursor: string | null;
  total: number;
};

export type SourcingRepository = {
  findClientByPhone(tenantId: string, phone: string): Promise<{ id: string } | null>;
  createClient(
    tenantId: string,
    client: CreateSourcingInput["client"],
  ): Promise<{ id: string; wasNew: boolean }>;
  generateCode(tenantId: string): Promise<string>;
  createRequest(
    tenantId: string,
    clientId: string,
    requestCode: string,
    input: CreateSourcingInput,
  ): Promise<{ id: string }>;
  listRequests(
    tenantId: string,
    query: z.infer<typeof sourcingListQuerySchema>,
  ): Promise<SourcingPage>;
  getRequest(tenantId: string, id: string): Promise<SourcingRecord | null>;
  updateRequest(
    tenantId: string,
    id: string,
    input: UpdateSourcingInput,
  ): Promise<SourcingRecord | null>;
  softDeleteRequest(tenantId: string, id: string): Promise<boolean>;
};

type Authenticate = (request: Request) => Promise<SessionContext>;

const recordSelection =
  "id, tenant_id, request_code, client_id, raw_message, client_images, screenshots, source, quantity, unit, destination, target_price_cny, category, deadline, requirements, source_notes, status, created_at, updated_at";

const sourcingRecordSchema = z
  .object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    request_code: z.string(),
    client_id: z.string().uuid().nullable(),
    raw_message: z.string().nullable(),
    client_images: z.array(z.string()),
    screenshots: z.array(z.string()),
    source: z.string().nullable(),
    quantity: z.number().nullable(),
    unit: z.string().nullable(),
    destination: z.string().nullable(),
    target_price_cny: z.number().nullable(),
    category: z.string().nullable(),
    deadline: z.string().nullable(),
    requirements: z.string().nullable(),
    source_notes: z.string().nullable(),
    status: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .strict();

const idSchema = z.string().uuid();

function parseId(id: string): string {
  return idSchema.parse(id);
}

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

function dbRecord(data: unknown): SourcingRecord {
  return sourcingRecordSchema.parse(data);
}

export function createSourcingCollectionHandlers(
  repository: SourcingRepository,
  authenticate: Authenticate = requireSession,
) {
  return {
    POST: async ({ request }: { request: Request }): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const input = createSourcingInputSchema.parse(await readJson(request));
        let client = await repository.findClientByPhone(session.tenantId, input.client.phone);
        let clientWasNew = false;
        if (!client) {
          const createdClient = await repository.createClient(session.tenantId, input.client);
          client = { id: createdClient.id };
          clientWasNew = createdClient.wasNew;
        }
        const requestCode = await repository.generateCode(session.tenantId);
        const created = await repository.createRequest(
          session.tenantId,
          client.id,
          requestCode,
          input,
        );

        return ok(
          {
            sourcingId: created.id,
            clientId: client.id,
            requestCode,
            clientWasNew,
          },
          201,
        );
      } catch (error) {
        return handleError(error, "api.sourcing.create");
      }
    },
    GET: async ({ request }: { request: Request }): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const query = sourcingListQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        );
        const page = await repository.listRequests(session.tenantId, query);
        return json({ data: page.records, nextCursor: page.nextCursor, total: page.total });
      } catch (error) {
        return handleError(error, "api.sourcing.list");
      }
    },
  };
}

export function createSourcingIdHandlers(
  repository: SourcingRepository,
  authenticate: Authenticate = requireSession,
) {
  return {
    GET: async ({
      request,
      params,
    }: {
      request: Request;
      params: { id: string };
    }): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const id = parseId(params.id);
        const record = await repository.getRequest(session.tenantId, id);
        if (!record) throw fail("NOT_FOUND", "Sourcing request not found.", 404);
        return ok(record);
      } catch (error) {
        return handleError(error, "api.sourcing.get");
      }
    },
    PATCH: async ({
      request,
      params,
    }: {
      request: Request;
      params: { id: string };
    }): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const id = parseId(params.id);
        const input = updateSourcingInputSchema.parse(await readJson(request));
        const record = await repository.updateRequest(session.tenantId, id, input);
        if (!record) throw fail("NOT_FOUND", "Sourcing request not found.", 404);
        return ok(record);
      } catch (error) {
        return handleError(error, "api.sourcing.update");
      }
    },
    DELETE: async ({
      request,
      params,
    }: {
      request: Request;
      params: { id: string };
    }): Promise<Response> => {
      try {
        const session = await authenticate(request);
        const id = parseId(params.id);
        const deleted = await repository.softDeleteRequest(session.tenantId, id);
        if (!deleted) throw fail("NOT_FOUND", "Sourcing request not found.", 404);
        return ok({ deleted: true });
      } catch (error) {
        return handleError(error, "api.sourcing.delete");
      }
    },
  };
}

export function createSourcingRepository(
  getClient: () => ReturnType<typeof import("../supabase/admin.ts").getAdminClient>,
): SourcingRepository {
  return {
    async findClientByPhone(tenantId, phone) {
      const { data, error } = await getClient()
        .from("clients")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone", phone)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const parsed = z.object({ id: z.string().uuid() }).strict().parse(data);
      return { id: parsed.id };
    },
    async createClient(tenantId, client) {
      const { data, error } = await getClient()
        .from("clients")
        .insert({
          tenant_id: tenantId,
          name: client.name ?? null,
          phone: client.phone,
          whatsapp: client.whatsapp ?? null,
          country: client.country,
          city: client.city ?? null,
          currency: client.currency,
        })
        .select("id")
        .single();
      if (error) {
        const existingClient = await this.findClientByPhone(tenantId, client.phone);
        if (existingClient) return { ...existingClient, wasNew: false };
        throw error;
      }
      const createdClient = z.object({ id: z.string().uuid() }).strict().parse(data);
      return { ...createdClient, wasNew: true };
    },
    async generateCode(tenantId) {
      const { data, error } = await getClient().rpc("generate_sourcing_code", {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      return z.string().min(1).parse(data);
    },
    async createRequest(tenantId, clientId, requestCode, input) {
      const { data, error } = await getClient()
        .from("sourcing_requests")
        .insert({
          tenant_id: tenantId,
          request_code: requestCode,
          client_id: clientId,
          raw_message: input.product.description,
          client_images: input.productImages,
          screenshots: input.screenshots,
          source: input.source,
          quantity: input.product.quantity,
          unit: input.product.unit,
          destination: input.client.city
            ? `${input.client.city}, ${input.client.country}`
            : input.client.country,
          target_price_cny: input.product.targetPriceCny ?? null,
          category: input.product.category ?? null,
          deadline: input.product.deadline ?? null,
          requirements: input.product.requirements ?? null,
          source_notes: input.sourceNotes ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return z.object({ id: z.string().uuid() }).strict().parse(data);
    },
    async listRequests(tenantId, query) {
      let countQuery = getClient()
        .from("sourcing_requests")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);
      if (query.status) countQuery = countQuery.eq("status", query.status);
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      let request = getClient()
        .from("sourcing_requests")
        .select(recordSelection)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);
      if (query.status) request = request.eq("status", query.status);
      if (query.cursor) request = request.gt("id", query.cursor);
      const { data, error } = await request.order("id", { ascending: true }).limit(query.limit + 1);
      if (error) throw error;
      const records = z.array(sourcingRecordSchema).parse(data);
      const hasMore = records.length > query.limit;
      const pageRecords = records.slice(0, query.limit);
      return {
        records: pageRecords,
        nextCursor: hasMore ? (pageRecords.at(-1)?.id ?? null) : null,
        total: count ?? 0,
      };
    },
    async getRequest(tenantId, id) {
      const { data, error } = await getClient()
        .from("sourcing_requests")
        .select(recordSelection)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data ? dbRecord(data) : null;
    },
    async updateRequest(tenantId, id, input) {
      const update: Database["public"]["Tables"]["sourcing_requests"]["Update"] = {};
      if (input.source !== undefined) update["source"] = input.source;
      if (input.screenshots !== undefined) update["screenshots"] = input.screenshots;
      if (input.productImages !== undefined) update["client_images"] = input.productImages;
      if (input.sourceNotes !== undefined) update["source_notes"] = input.sourceNotes;
      if (input.status !== undefined) update["status"] = input.status;
      if (input.quantity !== undefined) update["quantity"] = input.quantity;
      if (input.category !== undefined) update["category"] = input.category;
      if (input.targetPriceCny !== undefined) update["target_price_cny"] = input.targetPriceCny;
      if (input.deadline !== undefined) update["deadline"] = input.deadline;
      if (input.requirements !== undefined) update["requirements"] = input.requirements;
      update["updated_at"] = new Date().toISOString();

      const { data, error } = await getClient()
        .from("sourcing_requests")
        .update(update)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .select(recordSelection)
        .maybeSingle();
      if (error) throw error;
      return data ? dbRecord(data) : null;
    },
    async softDeleteRequest(tenantId, id) {
      const { data, error } = await getClient()
        .from("sourcing_requests")
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
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
