import { NextResponse } from "next/server";
import { getCitationPushConfig } from "@/lib/citation-engine-push-server";

export async function GET() {
  const config = getCitationPushConfig();
  return NextResponse.json({
    ...config,
    message: config.pushAvailable
      ? "Push targets configured"
      : "Push disabled — content is saved to a local queue until services are enabled",
  });
}
