import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/session";
import {
  loadCitationMonitorSchedules,
  saveCitationMonitorSchedule,
} from "@/lib/citation-monitor-schedule";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = await loadCitationMonitorSchedules();
  return NextResponse.json({ schedules });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { brandName, queries, competitors, enabled, notifyEmail, id } = body;

    if (!brandName?.trim() || !queries?.length) {
      return NextResponse.json(
        { error: "brandName and queries are required" },
        { status: 400 }
      );
    }

    const schedule = await saveCitationMonitorSchedule({
      id,
      brandName,
      queries,
      competitors: competitors ?? [],
      enabled: enabled !== false,
      notifyEmail:
        notifyEmail?.trim() ||
        session.user.email ||
        process.env.CITATION_MONITOR_NOTIFY_EMAIL,
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error("Save citation schedule error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
