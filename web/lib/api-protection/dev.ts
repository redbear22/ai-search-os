/** Security hardening (jitter, rate limits, canary scans) stays on in production. */
export function isProductionSecurityEnabled(): boolean {
  return process.env.NODE_ENV === "production";
}
