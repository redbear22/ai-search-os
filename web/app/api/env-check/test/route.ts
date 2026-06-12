import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  testServiceConnectivity,
  type EnvServiceId,
} from "@/lib/env-diagnostics";

const VALID_SERVICES: EnvServiceId[] = [
  "openai",
  "perplexity",
  "claude",
  "gemini",
  "dataforseo",
  "trends",
  "keywords_everywhere",
  "keepa",
  "gsc",
  "google_oauth",
  "agent",
  "citation",
  "upstash",
  "database",
];

export async function POST(request: NextRequest) {
  const authResult = await requireAdminSession();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { service } = await request.json();
    if (!VALID_SERVICES.includes(service)) {
      return NextResponse.json({ error: "Invalid service id" }, { status: 400 });
    }

    const result = await testServiceConnectivity(service);
    return NextResponse.json({ service, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
