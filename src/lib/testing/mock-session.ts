export function mockSession(tenantId: string, userId: string): Headers {
  const tokenPayload = btoa(JSON.stringify({ tenantId, userId }));
  return new Headers({ authorization: `Bearer test-session.${tokenPayload}` });
}
