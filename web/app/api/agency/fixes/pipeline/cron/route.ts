import { NextResponse } from "next/server";
import { processFollowupReminders } from "@/lib/automated-fix-pipeline";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const followupsSent = await processFollowupReminders();
  return NextResponse.json({ ok: true, followupsSent });
}
