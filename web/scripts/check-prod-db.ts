import { PrismaClient } from "@prisma/client";

function host(url: string | undefined): string {
  if (!url) return "MISSING";
  const match = url.match(/@([^:/?]+)/);
  return match?.[1] ?? "parse-fail";
}

function ref(url: string | undefined): string {
  if (!url) return "?";
  const match = url.match(/postgres\.([^:]+)/);
  return match?.[1] ?? "direct";
}

function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    ""
  );
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  console.log("DATABASE_URL host:", host(process.env.DATABASE_URL), "ref:", ref(process.env.DATABASE_URL));
  console.log("POSTGRES_PRISMA_URL host:", host(process.env.POSTGRES_PRISMA_URL), "ref:", ref(process.env.POSTGRES_PRISMA_URL));
  console.log("Resolved host:", host(databaseUrl), "ref:", ref(databaseUrl));

  if (!databaseUrl) {
    console.error("No database URL configured");
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const users = await prisma.user.findMany({
      select: { email: true, role: true },
      orderBy: { email: "asc" },
    });
    console.log("User count:", users.length);
    console.log(JSON.stringify(users, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("DB check failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
