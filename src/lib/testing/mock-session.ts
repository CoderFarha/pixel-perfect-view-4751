/**
 * Creates test Authorization headers for callers that mock token verification.
 */
export function mockSessionHeaders(tenantId: string, userId: string): Headers {
  void tenantId;
  void userId;
  return new Headers({ authorization: "Bearer test-token" });
}

/**
 * Returns a fixed, isolated identity for unit tests that do not call Supabase.
 */
export function createMockAuthContext(): {
  userId: string;
  tenantId: string;
  email: string;
} {
  return {
    userId: "test-user-1",
    tenantId: "test-tenant-1",
    email: "test-user@example.test",
  };
}

/**
 * Creates headers containing an encoded mock session for the auth unit tests.
 */
export function mockSession(tenantId: string, userId: string): Headers {
  const tokenPayload = btoa(JSON.stringify({ tenantId, userId }));
  return new Headers({ authorization: `Bearer test-session.${tokenPayload}` });
}
