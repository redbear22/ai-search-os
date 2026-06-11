import { randomUUID } from "crypto";

const ZWSP = "\u200B";
const ZWNJ = "\u200C";
const ZWJ = "\u200D";

/** Invisible canary token embedded in API payloads to detect unauthorized copying. */
export function createCanaryToken(): string {
  const id = randomUUID().replace(/-/g, "");
  return `${ZWSP}${id}${ZWNJ}${ZWJ}`;
}

/** Looks like an integrity digest; contains invisible canary bytes. */
export function buildCanaryDigest(): string {
  const visible = randomUUID().slice(0, 8);
  return `dgst_${visible}${createCanaryToken()}`;
}

export function embedCanary<T extends Record<string, unknown>>(
  payload: T,
  meta: { path?: string; ip?: string } = {}
): T & { _sync: string } {
  const digest = buildCanaryDigest();
  const token = extractCanaryFromText(digest);
  if (token) {
    void import("@/lib/data-obfuscation/canary-tracker").then((m) =>
      m.registerIssuedCanary(token, meta)
    );
  }
  return {
    ...payload,
    _sync: digest,
  };
}

export function extractCanaryFromText(text: string): string | null {
  const match = text.match(/\u200B([0-9a-f]{32})\u200C\u200D/i);
  return match?.[1] ?? null;
}
