import { NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  aggregateCrawlerHits,
  gapSeverityForPath,
  parseAccessLogContent,
  type ParsedCrawlerHit,
} from "@/lib/crawler-log-parser";
import { checkSiteRobots } from "@/lib/crawler-robots-check";
import { requireWorkflowContext } from "@/lib/workflow-access";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  let siteUrl = "";
  let hits: ParsedCrawlerHit[] = [];
  let linesProcessed = 0;
  let truncated = false;

  if (contentType.includes("application/json")) {
    let body: { siteUrl?: string; entries?: ParsedCrawlerHit[]; logText?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    siteUrl = body.siteUrl?.trim() ?? "";
    if (body.entries && Array.isArray(body.entries)) {
      hits = body.entries;
    } else if (body.logText) {
      const parsed = parseAccessLogContent(body.logText);
      hits = parsed.hits;
      linesProcessed = parsed.linesProcessed;
      truncated = parsed.truncated;
    } else {
      return NextResponse.json({ error: "Provide entries or logText" }, { status: 400 });
    }
  } else {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 });
    }

    siteUrl = formData.get("siteUrl")?.toString().trim() ?? "";
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;
    const name = file.name.toLowerCase();
    if (name.endsWith(".gz")) {
      try {
        text = gunzipSync(buffer).toString("utf-8");
      } catch {
        return NextResponse.json({ error: "Failed to decompress .gz file" }, { status: 400 });
      }
    } else {
      text = buffer.toString("utf-8");
    }

    const parsed = parseAccessLogContent(text);
    hits = parsed.hits;
    linesProcessed = parsed.linesProcessed;
    truncated = parsed.truncated;
  }

  if (!siteUrl) {
    return NextResponse.json({ error: "siteUrl is required" }, { status: 400 });
  }

  const analysis = aggregateCrawlerHits(hits);
  let neverCrawled: { path: string; severity: "high" | "medium" }[] = [];

  try {
    const robots = await checkSiteRobots(siteUrl);
    if (robots.sitemapUrls.length > 0) {
      neverCrawled = robots.sitemapUrls
        .filter((path) => !analysis.allCrawledPaths.has(path))
        .map((path) => ({ path, severity: gapSeverityForPath(path) }));
    }
  } catch {
    // sitemap optional
  }

  const ctx = await requireWorkflowContext();
  const clientId = ctx instanceof NextResponse ? null : ctx.clientId;

  let summaryId: string | null = null;
  if (isDatabaseConfigured()) {
    try {
      if (hits.length > 0) {
        await prisma.crawlerLog.createMany({
          data: hits.map((h) => ({
            userId: session.user!.id!,
            clientId,
            siteUrl,
            crawlerBot: h.bot,
            page: h.page,
            statusCode: h.statusCode,
            crawledAt: h.timestamp ?? new Date(),
          })),
        });
      }

      const summary = await prisma.crawlerSummary.create({
        data: {
          userId: session.user!.id!,
          clientId,
          siteUrl,
          totalPages: neverCrawled.length + analysis.allCrawledPaths.size,
          crawledPages: analysis.allCrawledPaths.size,
          neverCrawled,
          summary: {
            byBot: analysis.byBot,
            errors: analysis.errors,
          },
        },
      });
      summaryId = summary.id;
    } catch (err) {
      console.error("[crawler-logs/parse] DB error:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    summaryId,
    siteUrl,
    linesProcessed,
    truncated,
    hitCount: hits.length,
    byBot: analysis.byBot,
    neverCrawled,
    errors: analysis.errors,
  });
}
