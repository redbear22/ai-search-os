import { NextRequest, NextResponse } from "next/server";
import { fetchTrendData } from "@/lib/trends-mcp-client";

export async function POST(request: NextRequest) {
  try {
    const { keywords, sources } = await request.json();
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: "keywords array is required" }, { status: 400 });
    }
    const trends = await fetchTrendData(keywords, sources);
    return NextResponse.json({ trends, mock: !process.env.TRENDS_MCP_API_KEY });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
