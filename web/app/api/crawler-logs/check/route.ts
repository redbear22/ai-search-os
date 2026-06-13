import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  checkSiteRobots,
  robotsFixSuggestions,
  type RobotsCheckResult,
} from "@/lib/crawler-robots-check";
import { AI_CRAWLERS, type CrawlerKey } from "@/lib/crawler-agents";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { siteUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const siteUrl = body.siteUrl?.trim();
  if (!siteUrl) {
    return NextResponse.json({ error: "siteUrl is required" }, { status: 400 });
  }

  try {
    const result: RobotsCheckResult = await checkSiteRobots(siteUrl);
    const fixes = robotsFixSuggestions(result);
    const blockedBotDetails = result.blockedBots.map((key) => ({
      key,
      name: AI_CRAWLERS[key as CrawlerKey].name,
      docs: AI_CRAWLERS[key as CrawlerKey].docs,
    }));

    return NextResponse.json({
      ok: true,
      ...result,
      blockedBotDetails,
      fixes,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Check failed",
      },
      { status: 502 }
    );
  }
}
