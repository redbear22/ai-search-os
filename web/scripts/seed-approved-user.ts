/**
 * Pre-approve a user before their first Google OAuth sign-in.
 *
 * Usage (from repo root):
 *   npx tsx web/scripts/seed-approved-user.ts user@example.com
 *   npx tsx web/scripts/seed-approved-user.ts user@example.com ADMIN
 *
 * Requires DATABASE_URL (loads web/.env.local then web/.env).
 *
 * SQL equivalent (Prisma uses cuid ids — prefer this script):
 *   INSERT INTO "User" (id, email, role, "createdAt", "updatedAt")
 *   VALUES ('manual-seed-id', 'user@example.com', 'APPROVED', NOW(), NOW())
 *   ON CONFLICT (email) DO UPDATE SET role = 'APPROVED', "updatedAt" = NOW();
 */

import { PrismaClient, type UserRole } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), "web/.env.local") });
config({ path: resolve(process.cwd(), "web/.env") });
config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const roleArg = (process.argv[3] ?? "APPROVED").toUpperCase();

  if (!email) {
    console.error("Usage: npx tsx web/scripts/seed-approved-user.ts <email> [APPROVED|ADMIN]");
    process.exit(1);
  }

  if (roleArg !== "APPROVED" && roleArg !== "ADMIN") {
    console.error("Role must be APPROVED or ADMIN");
    process.exit(1);
  }

  const role = roleArg as UserRole;

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, role },
    update: { role },
  });

  console.log(`Pre-approved ${user.email} as ${user.role} (id: ${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
