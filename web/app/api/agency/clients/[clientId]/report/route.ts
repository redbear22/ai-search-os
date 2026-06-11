import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAgencyBranding,
  resolveClientBranding,
} from "@/lib/agency-branding";
import {
  auditToPortalRow,
  parseAuditData,
} from "@/lib/client-portal";
import { computeShareOfVoice } from "@/lib/checkin-snapshot";
import { computeNextReportAt } from "@/lib/white-label-report";
import { requireAgencyAccess } from "@/lib/workspace";
import type { ReportFrequency, WhiteLabelReportData } from "@/types/white-label-report";

const settingsSelect = {
  reportFrequency: true,
  shareWithClient: true,
  agencyLogo: true,
  brandColor: true,
  reportFooterText: true,
  emailReports: true,
  nextReportAt: true,
  lastReportAt: true,
} as const;

type RouteContext = { params: Promise<{ clientId: string }> };

function parseFrequency(value: string | undefined): ReportFrequency {
  return value === "weekly" ? "weekly" : "monthly";
}

export async function GET(_request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({ clientId });
  if (access instanceof NextResponse) return access;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    include: {
      agency: true,
      settings: { select: settingsSelect },
      audits: { orderBy: { createdAt: "desc" }, take: 2 },
      gaps: {
        where: { status: { not: "resolved" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { layer: true, severity: true, title: true },
      },
      _count: { select: { gaps: { where: { status: { not: "resolved" } } } } },
      actionPlans: { select: { status: true } },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const audits = client.audits
    .map((audit) => auditToPortalRow(audit.id, audit.createdAt, audit.auditData))
    .filter((audit): audit is NonNullable<typeof audit> => audit !== null);

  const latestAuditData = client.audits[0]
    ? parseAuditData(client.audits[0].auditData)
    : null;
  const previousAuditData = client.audits[1]
    ? parseAuditData(client.audits[1].auditData)
    : null;
  const latestSOV = latestAuditData ? computeShareOfVoice(latestAuditData) : 0;
  const previousSOV = previousAuditData ? computeShareOfVoice(previousAuditData) : latestSOV;
  const latestScores = audits[0];

  const agencyBranding = await getAgencyBranding(access.agencyId);
  const resolved = agencyBranding
    ? resolveClientBranding(agencyBranding, client.settings ?? undefined)
    : null;

  const hasClientLogoOverride = Boolean(client.settings?.agencyLogo);
  const hasClientColorOverride = Boolean(client.settings?.brandColor?.trim());
  const hasClientFooterOverride =
    client.settings?.reportFooterText !== undefined &&
    client.settings.reportFooterText !== null;

  const branding = {
    agencyLogo: resolved?.logoUrl ?? client.settings?.agencyLogo ?? null,
    brandColor:
      resolved?.primaryColor ??
      client.settings?.brandColor ??
      client.agency.primaryColor ??
      "#3b82f6",
    secondaryColor: resolved?.secondaryColor ?? "#64748b",
    fontFamily: resolved?.fontFamily ?? "Inter",
    reportHeader: resolved?.reportHeader ?? null,
    reportFooterText:
      resolved?.reportFooter ?? client.settings?.reportFooterText ?? null,
    agencyName: client.agency.name,
    agencyLogoFallback: client.agency.logo,
    inheritsFromAgency: Boolean(
      agencyBranding &&
        !hasClientLogoOverride &&
        !hasClientColorOverride &&
        !hasClientFooterOverride
    ),
  };

  const report: WhiteLabelReportData = {
    client: {
      id: client.id,
      name: client.name,
      domain: client.domain,
    },
    branding,
    metrics: {
      shareOfVoice: latestSOV,
      gapCount: client._count.gaps || client.audits[0]?.gapCount || 0,
      completedActions: client.actionPlans.filter((a) => a.status === "completed").length,
      improvement: Math.max(0, latestSOV - previousSOV),
      discoverability: latestScores?.discoverability ?? 0,
      clarity: latestScores?.clarity ?? 0,
      authority: latestScores?.authority ?? 0,
      trust: latestScores?.trust ?? 0,
    },
    topGaps: client.gaps,
    reportDate: new Date().toISOString(),
    settings: {
      reportFrequency: parseFrequency(client.settings?.reportFrequency),
      emailReports: client.settings?.emailReports ?? false,
      nextReportAt: client.settings?.nextReportAt?.toISOString() ?? null,
      lastReportAt: client.settings?.lastReportAt?.toISOString() ?? null,
    },
  };

  return NextResponse.json(report);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const access = await requireAgencyAccess({
    clientId,
    permission: "manage_clients",
  });
  if (access instanceof NextResponse) return access;

  let body: {
    agencyLogo?: string | null;
    brandColor?: string;
    reportFooterText?: string | null;
    emailReports?: boolean;
    reportFrequency?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: { id: true, settings: { select: { reportFrequency: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const frequency = body.reportFrequency
    ? parseFrequency(body.reportFrequency)
    : parseFrequency(existing.settings?.reportFrequency);

  const emailReports = body.emailReports ?? undefined;
  const nextReportAt =
    emailReports === true
      ? computeNextReportAt(frequency)
      : emailReports === false
        ? null
        : undefined;

  const settings = await prisma.clientSettings.upsert({
    where: { clientId },
    create: {
      clientId,
      agencyLogo: body.agencyLogo ?? null,
      brandColor: body.brandColor ?? "#3b82f6",
      reportFooterText: body.reportFooterText ?? null,
      emailReports: body.emailReports ?? false,
      reportFrequency: frequency,
      nextReportAt: nextReportAt ?? null,
    },
    update: {
      ...(body.agencyLogo !== undefined ? { agencyLogo: body.agencyLogo } : {}),
      ...(body.brandColor !== undefined ? { brandColor: body.brandColor } : {}),
      ...(body.reportFooterText !== undefined
        ? { reportFooterText: body.reportFooterText }
        : {}),
      ...(body.emailReports !== undefined ? { emailReports: body.emailReports } : {}),
      ...(body.reportFrequency !== undefined ? { reportFrequency: frequency } : {}),
      ...(nextReportAt !== undefined ? { nextReportAt } : {}),
    },
    select: settingsSelect,
  });

  return NextResponse.json({ settings });
}
