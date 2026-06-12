/** Mask OAuth client IDs — partial visibility only. */
export function maskClientId(value: string): string {
  if (value.length <= 12) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

/** Mask database connection strings — never expose credentials. */
export function maskDatabaseUrl(value: string): string {
  try {
    const normalized = value.replace(/^postgres(ql)?:\/\//, "http://");
    const parsed = new URL(normalized);
    const scheme = value.startsWith("postgresql://") ? "postgresql" : "postgres";
    const port = parsed.port ? `:${parsed.port}` : "";
    const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
    const search = parsed.search ?? "";
    return `${scheme}://***@${parsed.hostname}${port}${path}${search}`;
  } catch {
    return "postgres://***@***";
  }
}

export function maskSecret(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
