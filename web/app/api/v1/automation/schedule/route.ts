import type { NextRequest } from "next/server";
import { frequencyToDays } from "@/lib/autonomous-audit-intelligence";
import { generateWebhookSecret } from "@/lib/autonomous-audit-engine";
import { requireScope } from "@/lib/api-v1/auth";
import { apiV1Error, apiV1Success } from "@/lib/api-v1/response";
import { withApiV1, parseJsonBody, requireAgencyClient } from "@/lib/api-v1/handler";
import { prisma } from "@/lib/prisma";
import type { ScheduleAutomationRequest } from "@/types/api-v1";

function parseFrequency(value: string): "weekly" | "biweekly" | "monthly" {
  if (value === "biweekly" || value === "monthly") return value;
  return "weekly";
}

export const POST = withApiV1(async (request: NextRequest, _context, auth) => {
  const scopeError = requireScope(auth, "automation:write");
  if (scopeError) return scopeError;

  const body = await parseJsonBody<ScheduleAutomationRequest>(request);
  if (body instanceof Response) return body;

  if (!body.clientId) {
    return apiV1Error("validation_error", "clientId is required", 400);
  }

  const client = await requireAgencyClient(auth.agencyId, body.clientId);
  if (client instanceof Response) return client;

  const frequency = parseFrequency(body.frequency ?? "weekly");
  const enabled = body.enabled ?? true;

  const nextAuditAt = enabled
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + frequencyToDays(frequency));
        return d;
      })()
    : null;

  const config = await prisma.autonomousAuditConfig.upsert({
    where: { clientId: body.clientId },
    create: {
      clientId: body.clientId,
      enabled,
      auditFrequency: frequency,
      nextAuditAt,
      webhookSecret: generateWebhookSecret(),
    },
    update: {
      enabled,
      auditFrequency: frequency,
      ...(enabled ? { nextAuditAt } : { nextAuditAt: null }),
    },
    select: {
      clientId: true,
      enabled: true,
      auditFrequency: true,
      optimizedFrequency: true,
      nextAuditAt: true,
      lastAuditAt: true,
    },
  });

  return apiV1Success({
    clientId: config.clientId,
    enabled: config.enabled,
    frequency: config.optimizedFrequency ?? config.auditFrequency,
    nextAuditAt: config.nextAuditAt?.toISOString() ?? null,
    lastAuditAt: config.lastAuditAt?.toISOString() ?? null,
  });
});
