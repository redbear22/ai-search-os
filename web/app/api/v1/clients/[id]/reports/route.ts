import type { NextRequest } from "next/server";
import {
  auditToPortalRow,
  parseAuditData,
} from "@/lib/client-portal";
import { computeShareOfVoice } from "@/lib/checkin-snapshot";
import { requireScope } from "@/lib/api-v1/auth";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { withApiV1, requireAgencyClient } from "@/lib/api-v1/handler";
import {
  getAgencyBranding,
  resolveClientBranding,
} from "@/lib/agency-branding";
import { prisma } from "@/lib/prisma";
import type { WhiteLabelReportData } from "@/types/white-label-report";

export const POST = withApiV1(async (request: NextRequest, context, auth) => {
  const scopeError = requireScope(auth, "reports:write");
  if (scopeError) return scopeError;

  const { id: clientId } = await context.params;
  const clientResult = await requireAgencyClient(auth.agencyId, clientId);
  if (clientResult instanceof Response) return clientResult;

  let includePdf = false;
  try {
    const body = (await request.json()) as { format?: string };
    includePdf = body.format === "pdf";
  } catch {
    // default JSON only
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: auth.agencyId },
    include: {
      agency: true,
      settings: {
        select: {
          reportFrequency: true,
          agencyLogo: true,
          brandColor: true,
          reportFooterText: true,
          emailReports: true,
          nextReportAt: true,
          lastReportAt: true,
        },
      },
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
    return apiV1Error("not_found", "Client not found", 404);
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

  const agencyBranding = await getAgencyBranding(auth.agencyId);
  const resolved = agencyBranding
    ? resolveClientBranding(agencyBranding, client.settings ?? undefined)
    : null;

  const report: WhiteLabelReportData = {
    client: {
      id: client.id,
      name: client.name,
      domain: client.domain,
    },
    branding: {
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
    },
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
      reportFrequency:
        client.settings?.reportFrequency === "weekly" ? "weekly" : "monthly",
      emailReports: client.settings?.emailReports ?? false,
      nextReportAt: client.settings?.nextReportAt?.toISOString() ?? null,
      lastReportAt: client.settings?.lastReportAt?.toISOString() ?? null,
    },
  };

  let pdfBase64: string | undefined;
  if (includePdf) {
    const { jsPDF } = await import("jspdf");
    const { hexToRgb } = await import("@/lib/white-label-report");
    const doc = new jsPDF();
    const [r, g, b] = hexToRgb(report.branding.brandColor);
    doc.setTextColor(r, g, b);
    doc.setFontSize(16);
    doc.text(`${report.client.name} — AI Visibility Report`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Share of Voice: ${report.metrics.shareOfVoice}%`, 14, 32);
    doc.text(`Open Gaps: ${report.metrics.gapCount}`, 14, 40);
    const arrayBuffer = doc.output("arraybuffer");
    pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
  }

  return apiV1Success({
    report,
    ...(pdfBase64 ? { pdfBase64, pdfMimeType: "application/pdf" } : {}),
    downloadHint: `/api/agency/clients/${clientId}/report`,
  });
});
