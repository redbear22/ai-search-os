import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAgencyBranding } from "@/lib/agency-branding";
import { computeNextReportAt } from "@/lib/white-label-report";
import type { ReportFrequency } from "@/types/white-label-report";

/**
 * Dry-run scheduler for recurring white-label reports.
 * Wire to Vercel Cron or external job runner; email delivery requires SMTP config.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const due = await prisma.clientSettings.findMany({
    where: {
      emailReports: true,
      nextReportAt: { lte: now },
    },
    include: {
      client: {
        select: { id: true, name: true, agencyId: true },
      },
    },
  });

  const processed = [];

  for (const settings of due) {
    const frequency = (settings.reportFrequency === "weekly"
      ? "weekly"
      : "monthly") as ReportFrequency;

    await prisma.clientSettings.update({
      where: { id: settings.id },
      data: {
        lastReportAt: now,
        nextReportAt: computeNextReportAt(frequency, now),
      },
    });

    const agencyBranding = await getAgencyBranding(settings.client.agencyId);
    const brandedEmail = agencyBranding?.features.brandedEmails ?? false;

    processed.push({
      clientId: settings.client.id,
      clientName: settings.client.name,
      status: "scheduled",
      note: brandedEmail
        ? `[branded email dry-run] logo=${agencyBranding?.logoUrl ?? "none"} primary=${agencyBranding?.primaryColor ?? "#3b82f6"} — SMTP not configured`
        : "Email delivery not configured — report marked as due",
    });
  }

  return NextResponse.json({
    ok: true,
    processed: processed.length,
    reports: processed,
  });
}
