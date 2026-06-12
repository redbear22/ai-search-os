import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { normalizeDatabaseUrlForRuntime } from "../lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });

function rawDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || "";
}

async function test(label: string, url: string) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const user = await prisma.user.findFirst({
      where: { email: "redbearseoservices@gmail.com" },
      select: { email: true, role: true },
    });
    console.log(label, user ?? "NOT FOUND");
  } catch (error) {
    console.error(label, error instanceof Error ? error.message : error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const raw = rawDatabaseUrl();
  process.env.VERCEL = "1";
  const normalized = normalizeDatabaseUrlForRuntime(raw);
  console.log("raw port:", new URL(raw).port);
  console.log("normalized port:", new URL(normalized).port);
  await test("raw", raw);
  await test("normalized", normalized);
}

main();
