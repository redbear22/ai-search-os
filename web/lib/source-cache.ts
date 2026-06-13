import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";

export function buildSourceCacheKey(
  source: string,
  topic: string,
  brand?: string
): string {
  const raw = `${source}:${topic.toLowerCase().trim()}:${(brand ?? "").toLowerCase().trim()}`;
  return createHash("sha256").update(raw).digest("hex");
}

export async function getCachedSource<T>(cacheKey: string): Promise<T | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const row = await prisma.sourceCache.findUnique({ where: { cacheKey } });
    if (!row || row.expiresAt.getTime() < Date.now()) return null;
    return row.payload as T;
  } catch {
    return null;
  }
}

export async function setCachedSource(
  cacheKey: string,
  source: string,
  topic: string,
  brand: string | undefined,
  payload: unknown,
  ttlHours = 24
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  try {
    await prisma.sourceCache.upsert({
      where: { cacheKey },
      create: { cacheKey, source, topic, brand: brand ?? null, payload: payload as object, expiresAt },
      update: { payload: payload as object, expiresAt },
    });
  } catch (err) {
    console.error("[source-cache] write failed:", err);
  }
}
