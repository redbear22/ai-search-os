import { NextResponse } from "next/server";
import { runAutonomousAudit } from "@/lib/autonomous-audit-engine";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const secret = url.searchParams.get("secret")?.trim();

  if (!clientId || !secret) {
    return NextResponse.json({ error: "clientId and secret required" }, { status: 400 });
  }

  const config = await prisma.autonomousAuditConfig.findFirst({
    where: { clientId, webhookSecret: secret, enabled: true, triggerWebhook: true },
    select: { clientId: true },
  });

  if (!config) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }

  try {
    const result = await runAutonomousAudit(clientId, "webhook");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook audit failed" },
      { status: 500 }
    );
  }
}
