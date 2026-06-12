import type { Prisma } from "@prisma/client";
import type { AuditData } from "@/lib/audit-types";
import {
  getAgencyBranding,
  resolveClientBranding,
} from "@/lib/agency-branding";
import type { ClientPortalAudit, ClientPortalBranding, ClientPortalSummary } from "@/types/client-portal";
import { computeShareOfVoice } from "@/lib/checkin-snapshot";
import { prisma } from "@/lib/prisma";
import { generateClientAccessKey } from "@/lib/workspace";

export function getPortalBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  }
  return "http://localhost:3000";
}

export function buildClientPortalUrl(accessKey: string): string {
  return `${getPortalBaseUrl()}/portal/${encodeURIComponent(accessKey)}`;
}

export async function ensureClientPortalSettings(clientId: string) {
  const existing = await prisma.clientSettings.findUnique({ where: { clientId } });
  if (existing?.clientAccessKey) return existing;

  const accessKey = generateClientAccessKey();
  if (existing) {
    return prisma.clientSettings.update({
      where: { clientId },
      data: { clientAccessKey: accessKey },
    });
  }

  return prisma.clientSettings.create({
    data: { clientId, clientAccessKey: accessKey },
  });
}

export function parseAuditData(raw: Prisma.JsonValue): AuditData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as unknown as AuditData;
}

export function computeDiscoverabilityScore(audit: AuditData): number {
  const { seo, aso } = audit.discoverability;
  const seoScore = seo.siteHealth > 0 ? seo.siteHealth : 0;
  const asoScore = aso.aiVisibilityScore > 0 ? aso.aiVisibilityScore : 0;
  if (!seoScore && !asoScore) return 0;
  if (!seoScore) return Math.round(asoScore);
  if (!asoScore) return Math.round(seoScore);
  return Math.round((seoScore + asoScore) / 2);
}

export function computeClarityScore(audit: AuditData): number {
  const platforms = Object.values(audit.clarity.platforms);
  const scores: number[] = [];

  for (const platform of platforms) {
    const total =
      platform.correctItems.length +
      platform.wrongItems.length +
      platform.missingItems.length;
    if (total === 0) continue;
    scores.push(Math.round((platform.correctItems.length / total) * 100));
  }

  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function computeAuthorityScore(audit: AuditData): number {
  const { authority } = audit;
  const citingUs = authority.sourcesCitingUs.length;
  const competitorOnly = authority.sourcesCitingCompetitorsOnly.length;
  const total = citingUs + competitorOnly;

  if (total > 0) {
    return Math.round((citingUs / total) * 100);
  }

  if (authority.citedPages > 0) {
    return Math.min(100, Math.round(authority.citedPages / 2));
  }

  return authority.backlinksCount > 0 ? Math.min(100, Math.round(authority.backlinksCount / 50)) : 0;
}

export function computeTrustScore(audit: AuditData): number {
  const { trust } = audit;
  const sentiment = Math.round(trust.sentimentScore * 100);
  const rating =
    trust.averageRating > 0 ? Math.round((trust.averageRating / 5) * 100) : 0;

  if (trust.reviewCount > 0 && rating > 0) {
    return Math.round((sentiment + rating) / 2);
  }

  return sentiment;
}

export function auditToPortalRow(
  id: string,
  createdAt: Date,
  auditData: Prisma.JsonValue
): ClientPortalAudit | null {
  const parsed = parseAuditData(auditData);
  if (!parsed) return null;

  return {
    id,
    date: createdAt.toISOString(),
    discoverability: computeDiscoverabilityScore(parsed),
    clarity: computeClarityScore(parsed),
    authority: computeAuthorityScore(parsed),
    trust: computeTrustScore(parsed),
  };
}

export async function getClientByAccessKey(accessKey: string) {
  return prisma.clientSettings.findUnique({
    where: { clientAccessKey: accessKey },
    include: {
      client: {
        include: {
          agency: { include: { branding: true } },
          audits: { orderBy: { createdAt: "desc" }, take: 12 },
          actionPlans: { select: { status: true } },
          gaps: { where: { status: { not: "resolved" } }, select: { id: true } },
        },
      },
    },
  });
}

export async function buildClientPortalSummary(
  client: NonNullable<Awaited<ReturnType<typeof getClientByAccessKey>>>["client"],
  audits: ClientPortalAudit[],
  clientSettings?: {
    agencyLogo?: string | null;
    brandColor?: string | null;
    reportFooterText?: string | null;
  } | null
): Promise<ClientPortalSummary> {
  const latestAuditData = client.audits[0]
    ? parseAuditData(client.audits[0].auditData)
    : null;
  const previousAuditData = client.audits[1]
    ? parseAuditData(client.audits[1].auditData)
    : null;

  const latestSOV = latestAuditData ? computeShareOfVoice(latestAuditData) : 0;
  const previousSOV = previousAuditData ? computeShareOfVoice(previousAuditData) : latestSOV;

  const agencyBranding =
    (await getAgencyBranding(client.agencyId)) ?? {
      agencyId: client.agencyId,
      agencyName: client.agency.name,
      logoUrl: client.agency.logo,
      faviconUrl: client.agency.branding?.favicon ?? null,
      primaryColor: client.agency.primaryColor,
      secondaryColor: client.agency.branding?.secondaryColor ?? "#64748b",
      fontFamily: client.agency.branding?.fontFamily ?? "Inter",
      customDomain: client.agency.branding?.customDomain ?? null,
      portalName: client.agency.branding?.portalName ?? null,
      reportHeader: client.agency.branding?.reportHeader ?? null,
      reportFooter: client.agency.branding?.reportFooter ?? null,
      features: {
        showRecommendations: true,
        allowClientFeedback: true,
        enableChat: false,
        brandedEmails: false,
      },
    };

  const resolved = resolveClientBranding(agencyBranding, clientSettings ?? undefined);

  const branding: ClientPortalBranding = {
    name: resolved.agencyName,
    logo: resolved.logoUrl,
    favicon: resolved.faviconUrl,
    primaryColor: resolved.primaryColor,
    secondaryColor: resolved.secondaryColor,
    fontFamily: resolved.fontFamily,
    portalName: resolved.portalName,
    features: resolved.features,
  };

  return {
    id: client.id,
    name: client.name,
    domain: client.domain,
    latestSOV,
    gapCount: client.gaps.length || client.audits[0]?.gapCount || 0,
    completedActions: client.actionPlans.filter((action) => action.status === "completed").length,
    improvement: Math.max(0, latestSOV - previousSOV),
    agency: {
      name: branding.name,
      logo: branding.logo,
      favicon: branding.favicon,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      fontFamily: branding.fontFamily,
      portalName: branding.portalName,
    },
    branding,
  };
}
