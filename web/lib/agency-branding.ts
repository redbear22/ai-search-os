import type { AgencyBranding as AgencyBrandingModel, Prisma } from "@prisma/client";
import {
  DEFAULT_AGENCY_BRANDING_FEATURES,
  type AgencyBranding,
  type AgencyBrandingFeatures,
  type AgencyBrandingInput,
  type ResolvedClientBranding,
} from "@/types/agency-branding";
import { prisma } from "@/lib/prisma";

type ClientBrandingOverrides = {
  agencyLogo?: string | null;
  brandColor?: string | null;
  reportFooterText?: string | null;
};

function parseFeatures(raw: Prisma.JsonValue | null | undefined): AgencyBrandingFeatures {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_AGENCY_BRANDING_FEATURES };
  }
  const obj = raw as Record<string, unknown>;
  return {
    showRecommendations:
      typeof obj.showRecommendations === "boolean"
        ? obj.showRecommendations
        : DEFAULT_AGENCY_BRANDING_FEATURES.showRecommendations,
    allowClientFeedback:
      typeof obj.allowClientFeedback === "boolean"
        ? obj.allowClientFeedback
        : DEFAULT_AGENCY_BRANDING_FEATURES.allowClientFeedback,
    enableChat:
      typeof obj.enableChat === "boolean"
        ? obj.enableChat
        : DEFAULT_AGENCY_BRANDING_FEATURES.enableChat,
    brandedEmails:
      typeof obj.brandedEmails === "boolean"
        ? obj.brandedEmails
        : DEFAULT_AGENCY_BRANDING_FEATURES.brandedEmails,
  };
}

function brandingRowToAgencyBranding(
  agency: { id: string; name: string; logo: string | null; primaryColor: string },
  row: AgencyBrandingModel | null
): AgencyBranding {
  return {
    agencyId: agency.id,
    agencyName: agency.name,
    logoUrl: agency.logo,
    faviconUrl: row?.favicon ?? null,
    primaryColor: agency.primaryColor,
    secondaryColor: row?.secondaryColor ?? "#64748b",
    fontFamily: row?.fontFamily ?? "Inter",
    customDomain: row?.customDomain ?? null,
    portalName: row?.portalName ?? null,
    reportHeader: row?.reportHeader ?? null,
    reportFooter: row?.reportFooter ?? null,
    features: parseFeatures(row?.features),
  };
}

export async function getAgencyBranding(agencyId: string): Promise<AgencyBranding | null> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    include: { branding: true },
  });
  if (!agency) return null;
  return brandingRowToAgencyBranding(agency, agency.branding);
}

export function resolveClientBranding(
  agencyBranding: AgencyBranding,
  clientSettings?: ClientBrandingOverrides | null
): ResolvedClientBranding {
  const logoUrl =
    clientSettings?.agencyLogo !== undefined && clientSettings.agencyLogo !== null
      ? clientSettings.agencyLogo
      : agencyBranding.logoUrl;

  const primaryColor =
    clientSettings?.brandColor?.trim() || agencyBranding.primaryColor;

  const reportFooter =
    clientSettings?.reportFooterText !== undefined &&
    clientSettings.reportFooterText !== null
      ? clientSettings.reportFooterText
      : agencyBranding.reportFooter;

  return {
    ...agencyBranding,
    logoUrl,
    primaryColor,
    reportFooter,
  };
}

export function brandingToCssVars(
  branding: Pick<
    AgencyBranding,
    "primaryColor" | "secondaryColor" | "fontFamily"
  >
): Record<string, string> {
  return {
    "--brand-primary": branding.primaryColor,
    "--brand-secondary": branding.secondaryColor,
    "--brand-font": `"${branding.fontFamily}", system-ui, sans-serif`,
  };
}

export function googleFontStylesheetUrl(fontFamily: string): string {
  const family = fontFamily.trim().replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
}

export function loadGoogleFont(fontFamily: string): string {
  return googleFontStylesheetUrl(fontFamily);
}

export async function upsertAgencyBranding(
  agencyId: string,
  input: AgencyBrandingInput,
  primaryColorUpdate?: string
): Promise<AgencyBranding> {
  if (primaryColorUpdate) {
    await prisma.agency.update({
      where: { id: agencyId },
      data: { primaryColor: primaryColorUpdate },
    });
  }

  const featuresUpdate = input.features
    ? (await prisma.agencyBranding.findUnique({ where: { agencyId } }))?.features
    : undefined;

  const mergedFeatures = input.features
    ? { ...parseFeatures(featuresUpdate), ...input.features }
    : undefined;

  await prisma.agencyBranding.upsert({
    where: { agencyId },
    create: {
      agencyId,
      secondaryColor: input.secondaryColor ?? "#64748b",
      fontFamily: input.fontFamily ?? "Inter",
      customDomain: input.customDomain ?? null,
      portalName: input.portalName ?? null,
      reportHeader: input.reportHeader ?? null,
      reportFooter: input.reportFooter ?? null,
      features: mergedFeatures ?? DEFAULT_AGENCY_BRANDING_FEATURES,
    },
    update: {
      ...(input.secondaryColor !== undefined ? { secondaryColor: input.secondaryColor } : {}),
      ...(input.fontFamily !== undefined ? { fontFamily: input.fontFamily } : {}),
      ...(input.customDomain !== undefined ? { customDomain: input.customDomain } : {}),
      ...(input.portalName !== undefined ? { portalName: input.portalName } : {}),
      ...(input.reportHeader !== undefined ? { reportHeader: input.reportHeader } : {}),
      ...(input.reportFooter !== undefined ? { reportFooter: input.reportFooter } : {}),
      ...(mergedFeatures ? { features: mergedFeatures } : {}),
    },
  });

  const branding = await getAgencyBranding(agencyId);
  if (!branding) {
    throw new Error("Failed to load agency branding after upsert");
  }
  return branding;
}

export async function updateAgencyLogoUrl(
  agencyId: string,
  logoUrl: string
): Promise<void> {
  await prisma.agency.update({
    where: { id: agencyId },
    data: { logo: logoUrl },
  });
}

export async function updateAgencyFaviconUrl(
  agencyId: string,
  faviconUrl: string
): Promise<void> {
  await prisma.agencyBranding.upsert({
    where: { agencyId },
    create: {
      agencyId,
      favicon: faviconUrl,
      features: DEFAULT_AGENCY_BRANDING_FEATURES,
    },
    update: { favicon: faviconUrl },
  });
}
