import { NextResponse } from "next/server";
import {
  runBatchCitationCheck,
  identifyCitationGaps,
} from "@/lib/ai-citation-monitor";
import {
  appendCitationMonitorRun,
  loadCitationMonitorSchedules,
  markScheduleLastRun,
  type CitationMonitorRunSummary,
} from "@/lib/citation-monitor-schedule";
import { notifyCitationMonitorResults } from "@/lib/citation-monitor-notify";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = (await loadCitationMonitorSchedules()).filter(
    (s) => s.enabled && s.queries.length > 0 && s.brandName.trim()
  );

  if (schedules.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No enabled citation monitor schedules",
      runs: [],
    });
  }

  const runs: Array<CitationMonitorRunSummary & { emailSent: boolean }> = [];

  for (const schedule of schedules) {
    const ranAt = new Date().toISOString();

    try {
      const results = await runBatchCitationCheck(
        schedule.queries,
        schedule.brandName,
        schedule.competitors
      );
      const gaps = identifyCitationGaps(results);

      const summary: CitationMonitorRunSummary = {
        scheduleId: schedule.id,
        brandName: schedule.brandName,
        ranAt,
        totalChecked: results.length,
        gapsFound: gaps.length,
        topGaps: gaps.slice(0, 5).map((g) => ({
          query: g.query,
          platform: g.platform,
          competitorCited: g.competitorCited,
          severity: g.severity,
        })),
      };

      await appendCitationMonitorRun(summary);
      await markScheduleLastRun(schedule.id, ranAt);

      const { sent } = await notifyCitationMonitorResults(
        summary,
        gaps,
        schedule.notifyEmail
      );

      runs.push({ ...summary, emailSent: sent });
    } catch (error) {
      console.error(`Citation cron failed for ${schedule.id}:`, error);
      runs.push({
        scheduleId: schedule.id,
        brandName: schedule.brandName,
        ranAt,
        totalChecked: 0,
        gapsFound: 0,
        topGaps: [],
        emailSent: false,
      });
    }
  }

  return NextResponse.json({
    success: true,
    schedulesRun: runs.length,
    runs,
  });
}
