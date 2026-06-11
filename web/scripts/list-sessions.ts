import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const sessions = await prisma.session.findMany({
    include: { user: { select: { email: true, role: true } } },
  });
  console.log("sessions:", JSON.stringify(sessions, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
