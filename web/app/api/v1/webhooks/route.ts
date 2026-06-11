import type { NextRequest } from "next/server";
import { requireScope } from "@/lib/api-v1/auth";
import { generateWebhookSecret } from "@/lib/api-v1/crypto";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { withApiV1, parseJsonBody } from "@/lib/api-v1/handler";
import { prisma } from "@/lib/prisma";
import type { CreateWebhookRequest, WebhookEventType } from "@/types/api-v1";

const VALID_EVENTS: WebhookEventType[] = [
  "audit.completed",
  "gap.detected",
  "fix.generated",
  "client.health.changed",
];

export const GET = withApiV1(async (_request, _context, auth) => {
  const scopeError = requireScope(auth, "webhooks:write");
  if (scopeError) return scopeError;

  const webhooks = await prisma.apiWebhook.findMany({
    where: { agencyId: auth.agencyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      enabled: true,
      createdAt: true,
    },
  });

  return apiV1Success(
    webhooks.map((wh) => ({
      id: wh.id,
      url: wh.url,
      events: JSON.parse(wh.events) as WebhookEventType[],
      enabled: wh.enabled,
      createdAt: wh.createdAt.toISOString(),
    }))
  );
});

export const POST = withApiV1(async (request: NextRequest, _context, auth) => {
  const scopeError = requireScope(auth, "webhooks:write");
  if (scopeError) return scopeError;

  const body = await parseJsonBody<CreateWebhookRequest>(request);
  if (body instanceof Response) return body;

  const url = body.url?.trim();
  if (!url) {
    return apiV1Error("validation_error", "url is required", 400);
  }

  try {
    new URL(url);
  } catch {
    return apiV1Error("validation_error", "url must be a valid URL", 400);
  }

  const events = (body.events ?? []).filter((e) => VALID_EVENTS.includes(e));
  if (events.length === 0) {
    return apiV1Error(
      "validation_error",
      `events must include at least one of: ${VALID_EVENTS.join(", ")}`,
      400
    );
  }

  const secret = body.secret?.trim() || generateWebhookSecret();

  const webhook = await prisma.apiWebhook.create({
    data: {
      agencyId: auth.agencyId,
      url,
      secret,
      events: JSON.stringify(events),
      enabled: true,
    },
    select: { id: true, url: true, events: true, enabled: true, createdAt: true },
  });

  return apiV1Success(
    {
      id: webhook.id,
      url: webhook.url,
      events: JSON.parse(webhook.events) as WebhookEventType[],
      secret,
      enabled: webhook.enabled,
      createdAt: webhook.createdAt.toISOString(),
    },
    { warning: "Store the secret securely for signature verification." },
    201
  );
});
