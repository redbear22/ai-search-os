import { NextRequest, NextResponse } from "next/server";
import {
  getRecentAnalyticsEvents,
  isAnalyticsDebugAuthorized,
  persistAnalyticsEvent,
  sanitizeAnalyticsEvent,
} from "@/lib/analytics-server";

// POST: append event to analytics-data.json
// GET: read recent events (protected) — swap storage in analytics-server when moving to Postgres

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = sanitizeAnalyticsEvent(body);

    if (!event) {
      return NextResponse.json({ success: false, error: "Invalid analytics event" }, { status: 400 });
    }

    await persistAnalyticsEvent(event);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!isAnalyticsDebugAuthorized(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count, events } = await getRecentAnalyticsEvents(100);
  return NextResponse.json({ count, events });
}
