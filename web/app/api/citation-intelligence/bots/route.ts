import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildBotActivityFromRobots } from "@/lib/citation-intelligence";
import { withApiProtection } from "@/lib/api-protection";

export const dynamic = "force-dynamic";

async function handleGet(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")?.trim();

  if (!domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }

  const normalized = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const robotsUrl = `https://${normalized}/robots.txt`;

  try {
    const response = await fetch(robotsUrl, {
      headers: { "User-Agent": "AI-Search-OS-CitationIntel/1.0" },
      next: { revalidate: 3600 },
    });

    const robotsTxt = response.ok ? await response.text() : "";
    const botActivity = buildBotActivityFromRobots(robotsTxt);

    return NextResponse.json({
      domain: normalized,
      robotsFound: response.ok,
      botActivity,
    });
  } catch (error) {
    console.error("Bot activity fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch robots.txt" },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(handleGet, { critical: true });
