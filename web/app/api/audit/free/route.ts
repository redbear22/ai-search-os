import { ipAddress } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import {
  hasRecentFreeAudit,
  markFreeAuditUsed,
  trackAbuseEvent,
} from "@/lib/abuse-tracking";
import { canRunFreeAudit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type FreeAuditBody = {
  url?: string;
};

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function buildMockAudit(url: string) {
  const hostname = new URL(url).hostname;
  return {
    url,
    domain: hostname,
    score: 72,
    gaps: [
      "Missing structured data for AI citation",
      "No dedicated FAQ schema on key landing pages",
      "Brand entity signals are thin across knowledge graphs",
    ],
    platforms: {
      chatgpt: { visibility: "partial" },
      perplexity: { visibility: "low" },
      claude: { visibility: "partial" },
      gemini: { visibility: "low" },
    },
  };
}

export async function POST(request: NextRequest) {
  const ip = ipAddress(request) ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const isAdmin = await isAdminSession();

  let body: FreeAuditBody;
  try {
    body = (await request.json()) as FreeAuditBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url ? normalizeUrl(body.url) : null;
  if (!url) {
    return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
  }

  if (!isAdmin && (await hasRecentFreeAudit(ip))) {
    return NextResponse.json(
      {
        error: "Free audit already used from this IP. Try again in 24 hours.",
        code: "free_audit_used",
      },
      { status: 429 }
    );
  }

  const { success } = await canRunFreeAudit(ip, { skip: isAdmin });
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Try again later.", code: "rate_limited" },
      { status: 429 }
    );
  }

  const auditResult = buildMockAudit(url);

  if (!isAdmin) {
    await markFreeAuditUsed(ip);
    await trackAbuseEvent(ip, "free_audit", { url });
  }

  return NextResponse.json({
    success: true,
    audit: auditResult,
    message: "Free audit complete. Create an account to save results.",
  });
}
