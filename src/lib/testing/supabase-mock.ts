export type MockSupabaseUser = { id: string; app_metadata: Record<string, unknown> };

export type MockSupabaseResult = { data: unknown; error: Error | null };

export interface MockSupabaseQuery extends PromiseLike<MockSupabaseResult> {
  select(columns?: string): MockSupabaseQuery;
  insert(values: unknown): MockSupabaseQuery;
  update(values: unknown): MockSupabaseQuery;
  delete(): MockSupabaseQuery;
  eq(column: string, value: unknown): MockSupabaseQuery;
  single(): MockSupabaseQuery;
  maybeSingle(): MockSupabaseQuery;
}

export type MockSupabase = {
  auth: {
    getUser: () => Promise<{
      data: { user: MockSupabaseUser | null };
      error: Error | null;
    }>;
  };
  from: (table: string) => MockSupabaseQuery;
};

export type MockSupabaseOptions = {
  data?: unknown;
  error?: Error | null;
  auth?: Partial<MockSupabase["auth"]>;
};

/**
 * Creates a chainable mock Supabase client with configurable query results.
 */
export function createMockSupabase(options: MockSupabaseOptions = {}): MockSupabase {
  const result: MockSupabaseResult = {
    data: options.data ?? [],
    error: options.error ?? null,
  };

  const query: MockSupabaseQuery = {
    select: () => query,
    insert: () => query,
    update: () => query,
    delete: () => query,
    eq: () => query,
    single: () => query,
    maybeSingle: () => query,
    then<TResult1 = MockSupabaseResult, TResult2 = never>(
      onfulfilled?: ((value: MockSupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      ...options.auth,
    },
    from: () => query,
  };
}
