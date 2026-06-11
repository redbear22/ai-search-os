import { NextRequest, NextResponse } from "next/server";
import { isAnalyticsAuthorized, ANALYTICS_ADMIN_COOKIE } from "@/lib/analytics-auth";
import { buildAnalyticsDashboard } from "@/lib/analytics-dashboard";
import { getAllAnalyticsEvents } from "@/lib/analytics-server";

export async function GET(request: NextRequest) {
  const queryKey = request.nextUrl.searchParams.get("key");
  const authorized = isAnalyticsAuthorized({
    queryKey,
    authHeader: request.headers.get("authorization"),
    sessionCookie: request.cookies.get(ANALYTICS_ADMIN_COOKIE)?.value ?? null,
  });

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await getAllAnalyticsEvents();
  return NextResponse.json(buildAnalyticsDashboard(events));
}
