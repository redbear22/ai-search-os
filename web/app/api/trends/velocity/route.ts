import { NextRequest, NextResponse } from "next/server";
import { getTopicVelocity } from "@/lib/trends-mcp-client";

export async function POST(request: NextRequest) {
  try {
    const { topic, days = 30 } = await request.json();
    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }
    const velocity = await getTopicVelocity(topic, Number(days) || 30);
    return NextResponse.json({ velocity, mock: !process.env.TRENDS_MCP_API_KEY });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
