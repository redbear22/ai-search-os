/**
 * Seed a demo agency with two clients for workspace testing.
 *
 * Usage (from repo root):
 *   npx tsx web/scripts/seed-agency-demo.ts user@example.com
 *
 * Requires DATABASE_URL (loads web/.env.local then web/.env).
 */

import { PrismaClient, type AgencyRole, type UserRole } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), "web/.env.local") });
config({ path: resolve(process.cwd(), "web/.env") });
config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "agency";
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error("Usage: npx tsx web/scripts/seed-agency-demo.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      role: "APPROVED" as UserRole,
      agencyRole: "AGENCY_OWNER" as AgencyRole,
    },
    update: {
      role: "APPROVED",
      agencyRole: "AGENCY_OWNER",
    },
  });

  const agencySlug = slugify("demo-agency");
  const agency = await prisma.agency.upsert({
    where: { slug: agencySlug },
    create: {
      name: "Demo Agency",
      slug: agencySlug,
      ownerId: user.id,
      primaryColor: "#3b82f6",
      subscription: {
        create: {
          plan: "AGENCY",
          clientLimit: 10,
          teamMemberLimit: 5,
        },
      },
      clients: {
        create: [
          {
            name: "Northwind Coffee",
            domain: "northwindcoffee.example",
            settings: { create: {} },
          },
          {
            name: "Summit Outdoors",
            domain: "summitoutdoors.example",
            settings: { create: {} },
          },
        ],
      },
    },
    update: {
      name: "Demo Agency",
      ownerId: user.id,
    },
    include: { clients: true },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { agencyId: agency.id },
  });

  console.log(`Seeded agency "${agency.name}" (${agency.id}) for ${user.email}`);
  console.log(`Clients: ${agency.clients.map((c) => c.name).join(", ")}`);
  console.log("Sign in and use the client switcher or /settings/clients.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
