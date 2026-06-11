import { NextResponse } from "next/server";
import {
  getAgencyBranding,
  upsertAgencyBranding,
} from "@/lib/agency-branding";
import { GOOGLE_FONTS } from "@/types/agency-branding";
import type { AgencyBrandingInput } from "@/types/agency-branding";
import { requireAgencyAccess } from "@/lib/workspace";

export async function GET() {
  const access = await requireAgencyAccess({ permission: "view_agency_dashboard" });
  if (access instanceof NextResponse) return access;

  const branding = await getAgencyBranding(access.agencyId);
  if (!branding) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  return NextResponse.json(branding);
}

export async function PATCH(request: Request) {
  const access = await requireAgencyAccess({ permission: "manage_agency" });
  if (access instanceof NextResponse) return access;

  let body: AgencyBrandingInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.fontFamily && !GOOGLE_FONTS.includes(body.fontFamily as (typeof GOOGLE_FONTS)[number])) {
    return NextResponse.json({ error: "Unsupported font family" }, { status: 400 });
  }

  const hexPattern = /^#[0-9a-fA-F]{6}$/;
  if (body.primaryColor && !hexPattern.test(body.primaryColor)) {
    return NextResponse.json({ error: "primaryColor must be a hex color" }, { status: 400 });
  }
  if (body.secondaryColor && !hexPattern.test(body.secondaryColor)) {
    return NextResponse.json({ error: "secondaryColor must be a hex color" }, { status: 400 });
  }

  const customDomain =
    body.customDomain === undefined
      ? undefined
      : body.customDomain === null
        ? null
        : body.customDomain.trim() || null;

  const branding = await upsertAgencyBranding(
    access.agencyId,
    {
      secondaryColor: body.secondaryColor,
      fontFamily: body.fontFamily,
      customDomain,
      portalName:
        body.portalName === undefined
          ? undefined
          : body.portalName?.trim() || null,
      reportHeader:
        body.reportHeader === undefined
          ? undefined
          : body.reportHeader?.trim() || null,
      reportFooter:
        body.reportFooter === undefined
          ? undefined
          : body.reportFooter?.trim() || null,
      features: body.features,
    },
    body.primaryColor
  );

  return NextResponse.json(branding);
}
