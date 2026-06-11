import { PrismaClient } from "@prisma/client";
import { generateRecordId } from "@/lib/ids";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedPrismaClient> | undefined;
  basePrisma: PrismaClient | undefined;
};

function createBasePrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

/** Base client for NextAuth PrismaAdapter (must not use query extensions). */
export function getBasePrisma(): PrismaClient {
  if (!globalForPrisma.basePrisma) {
    globalForPrisma.basePrisma = createBasePrismaClient();
  }
  return globalForPrisma.basePrisma;
}

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() ?? "";
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
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
