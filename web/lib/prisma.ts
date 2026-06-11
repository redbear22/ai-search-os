import { PrismaClient } from "@prisma/client";
import { generateRecordId } from "@/lib/ids";

const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedPrismaClient> | undefined;
};

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}

export function isDatabaseConfigured(): boolean {
  return true;
}

function assignUuidId(data: unknown): void {
  if (!data || typeof data !== "object" || Array.isArray(data)) return;
  const record = data as Record<string, unknown>;
  if (record.id === undefined || record.id === null || record.id === "") {
    record.id = generateRecordId();
  }
}

function createExtendedPrismaClient() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
  }

  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

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
    globalForPrisma.prisma = createExtendedPrismaClient();
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
