import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plaintext: string, secret?: string): string {
  const keySecret = secret?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!keySecret) throw new Error("NEXTAUTH_SECRET is required for token encryption");

  const key = deriveKey(keySecret);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptToken(ciphertext: string, secret?: string): string {
  const keySecret = secret?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!keySecret) throw new Error("NEXTAUTH_SECRET is required for token decryption");

  const buf = Buffer.from(ciphertext, "base64url");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const key = deriveKey(keySecret);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Returns true if value looks like our encrypted blob (not plaintext JWT). */
export function isEncryptedToken(value: string): boolean {
  if (value.startsWith("ya29.") || value.startsWith("1//")) return false;
  try {
    const buf = Buffer.from(value, "base64url");
    return buf.length > IV_LEN + TAG_LEN + 8;
  } catch {
    return false;
  }
}
