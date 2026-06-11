import { createHash, randomBytes } from "crypto";

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString("base64url");
  const plaintext = `aiso_${raw}`;
  const hash = hashSecret(plaintext);
  const prefix = plaintext.slice(0, 8);
  return { plaintext, hash, prefix };
}

export function generateWebhookSecret(): string {
  return randomBytes(24).toString("base64url");
}

export function generateOAuthClientId(): string {
  return `aiso_oauth_${randomBytes(16).toString("hex")}`;
}

export function generateOAuthClientSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function generateOAuthAccessToken(): string {
  return randomBytes(32).toString("base64url");
}
