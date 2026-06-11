import { randomUUID } from "crypto";

/** UUID v4 for all new database records (non-sequential). */
export function generateRecordId(): string {
  return randomUUID();
}

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV4(value: string): boolean {
  return UUID_V4_RE.test(value);
}
