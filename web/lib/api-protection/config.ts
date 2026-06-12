/** Paths that require stricter protection (IP rate limit + optional HMAC for API keys). */
export const CRITICAL_API_PREFIXES = [
  "/api/gaps/detect",
  "/api/gaps/generate-fix",
  "/api/fixes/generate",
  "/api/citation/score",
  "/api/citation-intelligence",
  "/api/agent-readiness",
  "/api/zero-click",
  "/api/zero-click-visibility",
] as const;

/** No session/API-key gate in middleware (each route may still enforce its own rules). */
export const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/client",
  "/api/analytics/track",
  "/api/audit/free",
  "/api/user/plan",
  "/api/user/tier",
  "/api/v1/oauth/token",
  "/api/v1/openapi.json",
] as const;

/** Public routes that still get IP rate limiting (abuse-prone). */
export const RATE_LIMITED_PUBLIC_PREFIXES = [
  "/api/analytics/track",
  "/api/audit/free",
] as const;

export const CRON_API_PREFIXES = [
  "/api/agency/reports/cron",
  "/api/agency/fixes/pipeline/cron",
  "/api/agency/autonomous-audit/cron",
  "/api/citation-monitor/cron",
] as const;

/** Anonymous / public API abuse protection (per IP). */
export const IP_RATE_LIMIT_PER_HOUR = 100;
/** Signed-in session, API key, or cron callers on protected routes. */
export const AUTHENTICATED_IP_RATE_LIMIT_PER_HOUR = 1000;
export const JITTER_MIN_MS = 100;
export const JITTER_MAX_MS = 500;
export const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

export function isCriticalApiPath(pathname: string): boolean {
  return CRITICAL_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isRateLimitedPublicApiPath(pathname: string): boolean {
  return RATE_LIMITED_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isCronApiPath(pathname: string): boolean {
  return CRON_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}
