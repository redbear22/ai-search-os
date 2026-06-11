import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import type { WebhookEventType, WebhookPayload } from "@/types/api-v1";

function parseEvents(raw: string): WebhookEventType[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((e): e is WebhookEventType => typeof e === "string");
    }
  } catch {
    // fall through
  }
  return [];
}

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function dispatchWebhook(
  agencyId: string,
  event: WebhookEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.apiWebhook.findMany({
    where: { agencyId, enabled: true },
  });

  const matching = webhooks.filter((wh) => {
    const events = parseEvents(wh.events);
    return events.length === 0 || events.includes(event);
  });

  const envelope: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    agencyId,
    payload,
  };

  const body = JSON.stringify(envelope);

  if (matching.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[api-v1 webhook dry-run] ${event}`, envelope);
    }
    return;
  }

  await Promise.allSettled(
    matching.map(async (wh) => {
      const signature = signPayload(wh.secret, body);
      try {
        const res = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AISO-Signature": `sha256=${signature}`,
            "X-AISO-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok && process.env.NODE_ENV === "development") {
          console.warn(
            `[api-v1 webhook] ${event} → ${wh.url} failed: ${res.status}`
          );
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[api-v1 webhook] ${event} → ${wh.url} error:`, error);
        }
      }
    })
  );
}
