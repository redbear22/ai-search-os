import { NextRequest, NextResponse } from "next/server";
import { detectTrendingTopics } from "@/lib/trends-mcp-client";

export async function POST(request: NextRequest) {
  try {
    const { domain, competitors } = await request.json();
    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }
    const gaps = await detectTrendingTopics(
      domain,
      Array.isArray(competitors) ? competitors : []
    );
    return NextResponse.json({ gaps, mock: !process.env.TRENDS_MCP_API_KEY });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
