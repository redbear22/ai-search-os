import { NextResponse } from "next/server";
import { requireEnterprisePlan } from "@/lib/api-v1/auth";
import { generateWebhookSecret } from "@/lib/api-v1/crypto";
import { prisma } from "@/lib/prisma";
import { requireAgencyAccess } from "@/lib/workspace";
import type { CreateWebhookRequest, WebhookEventType } from "@/types/api-v1";

const VALID_EVENTS: WebhookEventType[] = [
  "audit.completed",
  "gap.detected",
  "fix.generated",
  "client.health.changed",
];

export async function GET() {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  const planError = await requireEnterprisePlan(access.agencyId, {
    userRole: access.role,
  });
  if (planError) return planError;

  const webhooks = await prisma.apiWebhook.findMany({
    where: { agencyId: access.agencyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    webhooks.map((wh) => ({
      id: wh.id,
      url: wh.url,
      events: JSON.parse(wh.events) as WebhookEventType[],
      enabled: wh.enabled,
      createdAt: wh.createdAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const access = await requireAgencyAccess({ permission: "manage_clients" });
  if (access instanceof NextResponse) return access;

  const planError = await requireEnterprisePlan(access.agencyId, {
    userRole: access.role,
  });
  if (planError) return planError;

  let body: CreateWebhookRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
  }

  const events = (body.events ?? []).filter((e) => VALID_EVENTS.includes(e));
  if (events.length === 0) {
    return NextResponse.json(
      { error: `events must include at least one of: ${VALID_EVENTS.join(", ")}` },
      { status: 400 }
    );
  }

  const secret = body.secret?.trim() || generateWebhookSecret();

  const webhook = await prisma.apiWebhook.create({
    data: {
      agencyId: access.agencyId,
      url,
      secret,
      events: JSON.stringify(events),
      enabled: true,
    },
    select: { id: true, url: true, events: true, enabled: true, createdAt: true },
  });

  return NextResponse.json(
    {
      id: webhook.id,
      url: webhook.url,
      events: JSON.parse(webhook.events) as WebhookEventType[],
      secret,
      enabled: webhook.enabled,
      createdAt: webhook.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
