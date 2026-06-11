import { NextRequest, NextResponse } from "next/server";
import {
  detectContentGaps,
  fetchBacklinks,
  fetchKeywordMetrics,
  fetchRankings,
  fetchTrendData,
  queryBrandPerception,
} from "@/lib/unified-data-client";
import type { AuditLayerId } from "@/lib/audit-types";

const LAYERS: AuditLayerId[] = ["discoverability", "clarity", "authority", "trust"];

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const layer = body.layer as AuditLayerId;
    const brandName = String(body.brandName ?? "").trim();
    const domain = String(body.domain ?? "").trim();
    const competitors = Array.isArray(body.competitors)
      ? body.competitors.map((c: string) => String(c).trim()).filter(Boolean)
      : [];

    if (!LAYERS.includes(layer)) {
      return NextResponse.json({ error: "Invalid layer" }, { status: 400 });
    }
    if (!brandName || !domain) {
      return NextResponse.json({ error: "brandName and domain are required" }, { status: 400 });
    }

    const keywords = [brandName, ...competitors];
    const forceRefresh = Boolean(body.forceRefresh);

    switch (layer) {
      case "discoverability": {
        const [kw, rankings, trends] = await Promise.all([
          fetchKeywordMetrics(keywords, forceRefresh),
          fetchRankings(domain, keywords, forceRefresh),
          fetchTrendData(keywords, forceRefresh),
        ]);
        return NextResponse.json({ layer, discoverability: { keywords: kw, rankings, trends } });
      }
      case "clarity": {
        const [clarity, contentGaps] = await Promise.all([
          queryBrandPerception(brandName, "openai", forceRefresh),
          detectContentGaps(domain, competitors, forceRefresh),
        ]);
        return NextResponse.json({ layer, clarity, contentGaps });
      }
      case "authority": {
        const authority = await fetchBacklinks(domain, forceRefresh);
        return NextResponse.json({ layer, authority });
      }
      case "trust": {
        return NextResponse.json({
          layer,
          trust: null,
          note: "Trust layer uses sentiment derived from clarity; add ASIN for Keepa reviews",
        });
      }
      default:
        return NextResponse.json({ error: "Unknown layer" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
