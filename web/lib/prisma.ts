import { PrismaClient } from "@prisma/client";
import { generateRecordId } from "@/lib/ids";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedPrismaClient> | undefined;
  basePrisma: PrismaClient | undefined;
};

function createBasePrismaClient() {
  const url = getDatabaseUrl();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: url ? { db: { url } } : undefined,
  });
}

/** Base client for NextAuth PrismaAdapter (must not use query extensions). */
export function getBasePrisma(): PrismaClient {
  if (!globalForPrisma.basePrisma) {
    globalForPrisma.basePrisma = createBasePrismaClient();
  }
  return globalForPrisma.basePrisma;
}

/** Resolve DB URL — Vercel Supabase integration sets POSTGRES_PRISMA_URL, not DATABASE_URL. */
export function getDatabaseUrl(): string {
  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  return normalizeDatabaseUrlForRuntime(raw);
}

/** Supabase session pooler (5432) fails on Vercel serverless — use transaction pooler (6543). */
export function normalizeDatabaseUrlForRuntime(url: string): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const isSupabasePooler = parsed.hostname.includes("pooler.supabase.com");
    const onVercel = process.env.VERCEL === "1";

    if (!isSupabasePooler || !onVercel) return url;

    if (parsed.port === "5432" || parsed.port === "") {
      parsed.port = "6543";
    }

    parsed.searchParams.set("pgbouncer", "true");
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

function assignUuidId(data: unknown): void {
  if (!data || typeof data !== "object" || Array.isArray(data)) return;
  const record = data as Record<string, unknown>;
  if (record.id === undefined || record.id === null || record.id === "") {
    record.id = generateRecordId();
  }
}

function createExtendedPrismaClient(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async create({ args, query }) {
          assignUuidId(args.data);
          return query(args);
        },
        async createMany({ args, query }) {
          const rows = args.data;
          if (Array.isArray(rows)) {
            rows.forEach(assignUuidId);
          } else {
            assignUuidId(rows);
          }
          return query(args);
        },
        async upsert({ args, query }) {
          assignUuidId(args.create);
          return query(args);
        },
      },
    },
  });
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createExtendedPrismaClient(getBasePrisma());
    void import("@/lib/data-obfuscation/honeypot")
      .then((m) => m.syncBlockedIpsFromDatabase())
      .catch(() => undefined);
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as ReturnType<typeof createExtendedPrismaClient>, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
