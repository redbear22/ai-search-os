import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";

/** Register a new AI platform release to trigger autonomous audits. */
export async function POST(request: Request) {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  let body: { platform?: string; version?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const platform = body.platform?.trim();
  const version = body.version?.trim();
  if (!platform || !version) {
    return NextResponse.json({ error: "platform and version required" }, { status: 400 });
  }

  const event = await prisma.platformReleaseEvent.create({
    data: { platform, version },
  });

  return NextResponse.json({
    ok: true,
    event: {
      id: event.id,
      platform: event.platform,
      version: event.version,
      releasedAt: event.releasedAt.toISOString(),
    },
    message: "Platform release registered. Event-driven audits will run on next cron cycle.",
  });
}
