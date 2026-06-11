import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

function formatAuditDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function GET() {
  const auth = await requireAgencyAccess();
  if (auth instanceof NextResponse) return auth;

  const agency = await prisma.agency.findUnique({
    where: { id: auth.agencyId },
    include: { subscription: true },
  });

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  const [teamCount, totalAudits, clients] = await Promise.all([
    prisma.user.count({ where: { agencyId: agency.id } }),
    prisma.audit.count({ where: { client: { agencyId: agency.id } } }),
    prisma.client.findMany({
      where: { agencyId: agency.id },
      include: {
        settings: true,
        audits: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    agency: {
      id: agency.id,
      name: agency.name,
      slug: agency.slug,
      logo: agency.logo,
      primaryColor: agency.primaryColor,
      teamCount,
      totalAudits,
      subscription: agency.subscription
        ? {
            plan: agency.subscription.plan,
            clientLimit: agency.subscription.clientLimit,
            teamMemberLimit: agency.subscription.teamMemberLimit,
          }
        : null,
    },
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      domain: client.domain,
      lastAuditDate: client.audits[0]
        ? formatAuditDate(client.audits[0].createdAt)
        : null,
      settings: client.settings
        ? {
            shareWithClient: client.settings.shareWithClient,
            reportFrequency: client.settings.reportFrequency,
            clientAccessKey: client.settings.clientAccessKey,
          }
        : null,
    })),
  });
}
