import { NextResponse } from "next/server";
import {
  evaluateEventTriggers,
  evaluateScheduledClients,
  runAutonomousAudit,
} from "@/lib/autonomous-audit-engine";

export const maxDuration = 300;
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

  const scheduled = await evaluateScheduledClients();
  const processed: Array<{ clientId: string; trigger: string; status: string }> = [];

  for (const item of scheduled) {
    try {
      const result = await runAutonomousAudit(item.clientId, item.trigger);
      processed.push({ clientId: item.clientId, trigger: item.trigger, status: result.status });
    } catch (error) {
      processed.push({
        clientId: item.clientId,
        trigger: item.trigger,
        status: error instanceof Error ? error.message : "failed",
      });
    }
  }

  const enabledConfigs = await import("@/lib/prisma").then((m) =>
    m.prisma.autonomousAuditConfig.findMany({
      where: { enabled: true },
      select: { clientId: true },
    })
  );

  for (const { clientId } of enabledConfigs) {
    const eventTriggers = await evaluateEventTriggers(clientId);
    for (const trigger of eventTriggers) {
      if (processed.some((p) => p.clientId === clientId && p.trigger === trigger)) continue;
      try {
        const result = await runAutonomousAudit(clientId, trigger);
        processed.push({ clientId, trigger, status: result.status });
      } catch (error) {
        processed.push({
          clientId,
          trigger,
          status: error instanceof Error ? error.message : "failed",
        });
      }
    }
  }

  return NextResponse.json({ ok: true, processed: processed.length, runs: processed });
}
