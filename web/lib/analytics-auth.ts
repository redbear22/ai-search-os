const PLACEHOLDER_SECRETS = new Set(["your-secret-key-here", "your-debug-secret"]);

export const ANALYTICS_ADMIN_COOKIE = "analytics_admin";

export function getAnalyticsSecret(): string | null {
  const secret = process.env.ANALYTICS_SECRET?.trim();
  if (!secret) return null;

  if (
    PLACEHOLDER_SECRETS.has(secret) &&
    process.env.NODE_ENV === "production"
  ) {
    return null;
  }

  return secret;
}

export function isAnalyticsConfigured(): boolean {
  return getAnalyticsSecret() !== null;
}

export function isAnalyticsAuthorized(options: {
  queryKey?: string | null;
  authHeader?: string | null;
  sessionCookie?: string | null;
}): boolean {
  const secret = getAnalyticsSecret();
  if (!secret) return false;

  if (options.sessionCookie === "1") return true;

  const queryKey = options.queryKey?.trim();
  if (queryKey && queryKey === secret) return true;

  const auth = options.authHeader?.trim();
  if (!auth) return false;

  if (auth === `Bearer ${secret}`) return true;

  if (auth.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
      const colon = decoded.indexOf(":");
      const password = colon >= 0 ? decoded.slice(colon + 1) : decoded;
      return password.trim() === secret;
    } catch {
      return false;
    }
  }

  return false;
}
