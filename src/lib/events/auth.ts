/**
 * Secure DIN Next ingest: require shared secret when configured.
 * Local simulator may use the same secret or a dedicated allow-list flag.
 */

export function getIngestSecret(): string | null {
  const secret =
    process.env.DIN_NEXT_INGEST_SECRET ??
    process.env.FF_INGEST_SECRET ??
    null;
  return secret && secret.trim() ? secret.trim() : null;
}

export function assertIngestAuthorized(request: Request): {
  ok: true;
} | { ok: false; status: number; error: string } {
  const required = getIngestSecret();
  if (!required) {
    // Dev / demo: open ingest when no secret configured
    return { ok: true };
  }

  const header =
    request.headers.get("x-ff-ingest-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!header || header !== required) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}
