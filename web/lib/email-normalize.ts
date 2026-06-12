/** Normalize email for auth allowlist lookups (Gmail ignores dots and +tags). */
export function normalizeAuthEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  if (domain === "gmail.com") {
    const plus = local.indexOf("+");
    if (plus >= 0) local = local.slice(0, plus);
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}
