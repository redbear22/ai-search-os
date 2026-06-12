import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateClientAccessKey, requireAgencyAccess } from "@/lib/workspace";

const clientSelect = {
  id: true,
  name: true,
  domain: true,
  agencyId: true,
  createdAt: true,
  updatedAt: true,
  settings: {
    select: {
      id: true,
      reportFrequency: true,
      shareWithClient: true,
      clientAccessKey: true,
      agencyLogo: true,
      brandColor: true,
      reportFooterText: true,
      emailReports: true,
      nextReportAt: true,
      lastReportAt: true,
    },
  },
} as const;

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: clientSelect,
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({
    clientId,
    permission: "manage_clients",
  });
  if (access instanceof NextResponse) return access;

  let body: {
    name?: string;
    domain?: string | null;
    reportFrequency?: string;
    shareWithClient?: boolean;
    agencyLogo?: string | null;
    brandColor?: string;
    reportFooterText?: string | null;
    emailReports?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const name = body.name?.trim();
  const domain =
    body.domain === undefined
      ? undefined
      : body.domain === null
        ? null
        : body.domain.trim() || null;

  const client = await prisma.client.update({
    where: { id: clientId },
    data: {
      ...(name ? { name } : {}),
      ...(domain !== undefined ? { domain } : {}),
      ...(body.reportFrequency !== undefined ||
      body.shareWithClient !== undefined ||
      body.agencyLogo !== undefined ||
      body.brandColor !== undefined ||
      body.reportFooterText !== undefined ||
      body.emailReports !== undefined
        ? {
            settings: {
              upsert: {
                create: {
                  reportFrequency: body.reportFrequency ?? "monthly",
                  shareWithClient: body.shareWithClient ?? false,
                  clientAccessKey: generateClientAccessKey(),
                  agencyLogo: body.agencyLogo ?? null,
                  brandColor: body.brandColor ?? "#3b82f6",
                  reportFooterText: body.reportFooterText ?? null,
                  emailReports: body.emailReports ?? false,
                },
                update: {
                  ...(body.reportFrequency !== undefined
                    ? { reportFrequency: body.reportFrequency }
                    : {}),
                  ...(body.shareWithClient !== undefined
                    ? { shareWithClient: body.shareWithClient }
                    : {}),
                  ...(body.agencyLogo !== undefined ? { agencyLogo: body.agencyLogo } : {}),
                  ...(body.brandColor !== undefined ? { brandColor: body.brandColor } : {}),
                  ...(body.reportFooterText !== undefined
                    ? { reportFooterText: body.reportFooterText }
                    : {}),
                  ...(body.emailReports !== undefined
                    ? { emailReports: body.emailReports }
                    : {}),
                },
              },
            },
          }
        : {}),
    },
    select: clientSelect,
  });

  return NextResponse.json(client);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({
    clientId,
    permission: "manage_clients",
  });
  if (access instanceof NextResponse) return access;

  const existing = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await prisma.client.delete({ where: { id: clientId } });

  return NextResponse.json({ ok: true });
}
