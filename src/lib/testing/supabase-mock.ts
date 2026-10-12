export type MockSupabaseUser = { id: string; app_metadata: Record<string, unknown> };

export type MockSupabase = {
  auth: {
    getUser: () => Promise<{
      data: { user: MockSupabaseUser | null };
      error: Error | null;
    }>;
  };
};

export function createMockSupabase(overrides: Partial<MockSupabase> = {}): MockSupabase {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      ...overrides.auth,
    },
  };
}
