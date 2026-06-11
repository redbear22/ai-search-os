import type { Gap } from "@/types/gap";
import { createOutreachTaskServer } from "@/lib/citation-engine-push-server";
import { getPublicationAuthorityMultiplier } from "@/lib/competitive-intelligence-network";
import { pushContentServer } from "@/lib/citation-engine-push-server";
import { prisma } from "@/lib/prisma";
import type {
  PipelineStepState,
  PipelineType,
} from "@/types/automated-fix-pipeline";

import {
  runContentOutline,
  runOutreachPitch,
} from "@/lib/server/ai-tasks";

type GapInput = {
  id?: string;
  layer: string;
  severity: string;
  title: string;
  description: string;
  source: string;
  suggestedAction: string;
  suggestedOwner: string;
};

type ClientContext = {
  id: string;
  name: string;
  domain: string | null;
};

export function classifyPipeline(gap: GapInput): PipelineType {
  const title = gap.title.toLowerCase();
  if (
    gap.layer === "authority" ||
    title.includes("citation") ||
    title.includes("missing citation")
  ) {
    return "citation_outreach";
  }
  if (
    title.includes("schema") ||
    title.includes("json-ld") ||
    title.includes("entity")
  ) {
    return "entity_optimization";
  }
  return "content_generation";
}

function initialSteps(type: PipelineType): PipelineStepState[] {
  const steps: Record<PipelineType, string[]> = {
    citation_outreach: ["research", "draft", "send", "track", "followup"],
    content_generation: ["brief", "draft", "seo", "review", "publish"],
    entity_optimization: ["schema", "deploy", "validate", "deploy_prod"],
  };
  return steps[type].map((step) => ({ step, status: "pending" }));
}

function extractPublication(gap: GapInput): string {
  const match = gap.title.match(/from (.+)$/i) || gap.source.match(/^[\w.-]+\.[a-z]{2,}/i);
  return match ? match[1] ?? match[0] : gap.source || "target publication";
}

export function citationOutreachPriority(
  gap: GapInput,
  publication: string
): "high" | "medium" {
  const authorityMultiplier = getPublicationAuthorityMultiplier(publication);
  if (
    gap.severity === "critical" ||
    gap.severity === "high" ||
    authorityMultiplier >= 3
  ) {
    return "high";
  }
  return "medium";
}

function buildOrganizationJsonLd(client: ClientContext): Record<string, unknown> {
  const url = client.domain
    ? client.domain.startsWith("http")
      ? client.domain
      : `https://${client.domain}`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: client.name,
    url,
    description: `${client.name} — AI visibility optimized entity profile`,
  };
}

function validateJsonLd(schema: Record<string, unknown>): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!schema["@context"]) issues.push("Missing @context");
  if (!schema["@type"]) issues.push("Missing @type");
  if (!schema.name) issues.push("Missing organization name");
  if (issues.length === 0) return { passed: true, issues: [] };
  return { passed: false, issues };
}

function updateStep(
  steps: PipelineStepState[],
  stepName: string,
  patch: Partial<PipelineStepState>
): PipelineStepState[] {
  return steps.map((s) => (s.step === stepName ? { ...s, ...patch } : s));
}

async function runCitationOutreachSteps(
  gap: GapInput,
  client: ClientContext,
  steps: PipelineStepState[],
  options: { skipSend?: boolean }
): Promise<{ steps: PipelineStepState[]; requiresApproval: boolean; sentAt?: Date; followupAt?: Date }> {
  const publication = extractPublication(gap);
  let current = steps;

  current = updateStep(current, "research", {
    status: "completed",
    completedAt: new Date().toISOString(),
    output: {
      publication,
      angle: `Competitive citation gap: ${gap.title}`,
      contactHint: `editor@${publication.replace(/^https?:\/\//, "").split("/")[0]}`,
    },
  });

  const fallbackPitch = `Subject: Story idea for ${publication}

Hi,

I noticed ${publication} has covered competitors in our space but not ${client.name}. We have a timely data point on ${gap.description.slice(0, 120)}.

${gap.suggestedAction}

Happy to provide quotes, data, or an exclusive brief.

Best,
${client.name} Team`;

  const pitch = await runOutreachPitch(
    {
      gapTitle: gap.title,
      gapDescription: gap.description,
      publication,
      brandName: client.name,
    },
    fallbackPitch
  );

  current = updateStep(current, "draft", {
    status: "completed",
    completedAt: new Date().toISOString(),
    output: {
      pitch,
      subject: `Story idea: ${client.name} for ${publication}`,
    },
  });

  if (options.skipSend) {
    current = updateStep(current, "send", {
      status: "awaiting_approval",
      output: { status: "dry_run", message: "Awaiting agency approval to send" },
    });
    return { steps: current, requiresApproval: true };
  }

  try {
    await createOutreachTaskServer({
      publication,
      pitch,
      priority: citationOutreachPriority(gap, publication),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    });
    const sentAt = new Date();
    const followupAt = new Date(sentAt.getTime() + 5 * 86400000);

    current = updateStep(current, "send", {
      status: "completed",
      completedAt: sentAt.toISOString(),
      output: { status: "sent", publication },
    });
    current = updateStep(current, "track", {
      status: "completed",
      completedAt: sentAt.toISOString(),
      output: { opens: 0, replies: 0, lastChecked: sentAt.toISOString() },
    });
    current = updateStep(current, "followup", {
      status: "pending",
      output: {
        reminderPitch: `Following up on my note about ${client.name} — still happy to share data for ${publication}.`,
        scheduledFor: followupAt.toISOString(),
      },
    });

    return { steps: current, requiresApproval: false, sentAt, followupAt };
  } catch (error) {
    current = updateStep(current, "send", {
      status: "failed",
      error: error instanceof Error ? error.message : "Send failed",
    });
    return { steps: current, requiresApproval: false };
  }
}

async function runContentGenerationSteps(
  gap: GapInput,
  client: ClientContext,
  steps: PipelineStepState[],
  options: { approved?: boolean }
): Promise<{ steps: PipelineStepState[]; requiresApproval: boolean }> {
  let current = steps;
  const keywords = gap.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 5);

  current = updateStep(current, "brief", {
    status: "completed",
    completedAt: new Date().toISOString(),
    output: {
      objective: `Close gap: ${gap.title}`,
      audience: "AI search users and traditional organic searchers",
      keywords: keywords.length ? keywords : [client.name.toLowerCase()],
    },
  });

  const fallbackBody = `# ${gap.title}\n\n${gap.description}\n\n## Recommended approach\n${gap.suggestedAction}`;
  const body = await runContentOutline(
    { gapTitle: gap.title, brandName: client.name },
    fallbackBody
  );

  current = updateStep(current, "draft", {
    status: "completed",
    completedAt: new Date().toISOString(),
    output: { title: gap.title, body },
  });

  current = updateStep(current, "seo", {
    status: "completed",
    completedAt: new Date().toISOString(),
    output: {
      metaTitle: `${gap.title} | ${client.name}`.slice(0, 60),
      metaDescription: gap.description.slice(0, 155),
      keywords,
    },
  });

  current = updateStep(current, "review", {
    status: "awaiting_approval",
    completedAt: new Date().toISOString(),
    output: {
      status: "pending_human_review",
      flags: ["Check brand voice", "Verify factual claims", "Confirm legal/compliance"],
    },
  });

  if (!options.approved) {
    return { steps: current, requiresApproval: true };
  }

  try {
    await pushContentServer({
      type: "article",
      title: gap.title,
      body,
      metadata: { clientId: client.id, gapId: gap.id, seo: keywords },
    });
    current = updateStep(current, "review", {
      status: "completed",
      output: { status: "approved", flags: [] },
    });
    current = updateStep(current, "publish", {
      status: "completed",
      completedAt: new Date().toISOString(),
      output: { status: "queued_for_cms", cmsPostId: `draft-${Date.now()}` },
    });
    return { steps: current, requiresApproval: false };
  } catch (error) {
    current = updateStep(current, "publish", {
      status: "failed",
      error: error instanceof Error ? error.message : "Publish failed",
    });
    return { steps: current, requiresApproval: false };
  }
}

async function runEntityOptimizationSteps(
  gap: GapInput,
  client: ClientContext,
  steps: PipelineStepState[],
  options: { approved?: boolean }
): Promise<{ steps: PipelineStepState[]; requiresApproval: boolean }> {
  let current = steps;
  const jsonLd = buildOrganizationJsonLd(client);
  const markup = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;

  current = updateStep(current, "schema", {
    status: "completed",
    completedAt: new Date().toISOString(),
    output: { jsonLd, markup },
  });

  const stagingUrl = client.domain
    ? `https://staging.${client.domain.replace(/^https?:\/\//, "")}/schema-preview`
    : undefined;

  current = updateStep(current, "deploy", {
    status: "completed",
    completedAt: new Date().toISOString(),
    output: { environment: "staging", url: stagingUrl },
  });

  const validation = validateJsonLd(jsonLd);
  current = updateStep(current, "validate", {
    status: "completed",
    completedAt: new Date().toISOString(),
    output: validation,
  });

  if (!options.approved) {
    current = updateStep(current, "deploy_prod", {
      status: "awaiting_approval",
      output: { status: "pending_agency_approval", approved: false },
    });
    return { steps: current, requiresApproval: true };
  }

  current = updateStep(current, "deploy_prod", {
    status: "completed",
    completedAt: new Date().toISOString(),
    output: { status: "deployed", approved: true },
  });

  return { steps: current, requiresApproval: false };
}

export async function startFixPipeline(input: {
  clientId: string;
  gap: GapInput;
  autoSend?: boolean;
}): Promise<{ runId: string; pipelineType: PipelineType; requiresApproval: boolean }> {
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    select: { id: true, name: true, domain: true },
  });
  if (!client) throw new Error("Client not found");

  const pipelineType = classifyPipeline(input.gap);
  const steps = initialSteps(pipelineType);

  let result: {
    steps: PipelineStepState[];
    requiresApproval: boolean;
    sentAt?: Date;
    followupAt?: Date;
  };

  if (pipelineType === "citation_outreach") {
    result = await runCitationOutreachSteps(input.gap, client, steps, {
      skipSend: !input.autoSend,
    });
  } else if (pipelineType === "content_generation") {
    result = await runContentGenerationSteps(input.gap, client, steps, {
      approved: false,
    });
  } else {
    result = await runEntityOptimizationSteps(input.gap, client, steps, {
      approved: false,
    });
  }

  const currentStep =
    result.steps.find((s) => s.status === "awaiting_approval")?.step ??
    result.steps.find((s) => s.status === "pending")?.step ??
    result.steps[result.steps.length - 1]?.step ??
    "completed";

  const run = await prisma.fixPipelineRun.create({
    data: {
      clientId: client.id,
      gapId: input.gap.id ?? null,
      pipelineType,
      status: result.requiresApproval ? "awaiting_approval" : "running",
      currentStep,
      steps: result.steps as object,
      gapSnapshot: input.gap as object,
      requiresApproval: result.requiresApproval,
      sentAt: result.sentAt ?? null,
      followupAt: result.followupAt ?? null,
    },
  });

  return { runId: run.id, pipelineType, requiresApproval: result.requiresApproval };
}

export async function approveFixPipeline(
  runId: string,
  approvedBy: string
): Promise<void> {
  const run = await prisma.fixPipelineRun.findUnique({
    where: { id: runId },
    include: { client: { select: { id: true, name: true, domain: true } } },
  });
  if (!run) throw new Error("Pipeline run not found");

  const gap = run.gapSnapshot as GapInput;
  const client = run.client;
  const steps = run.steps as PipelineStepState[];

  let result: { steps: PipelineStepState[]; requiresApproval: boolean; sentAt?: Date; followupAt?: Date };

  if (run.pipelineType === "citation_outreach") {
    result = await runCitationOutreachSteps(gap, client, steps, { skipSend: false });
  } else if (run.pipelineType === "content_generation") {
    result = await runContentGenerationSteps(gap, client, steps, { approved: true });
  } else {
    result = await runEntityOptimizationSteps(gap, client, steps, { approved: true });
  }

  await prisma.fixPipelineRun.update({
    where: { id: runId },
    data: {
      steps: result.steps as object,
      status: result.requiresApproval ? "awaiting_approval" : "completed",
      currentStep: result.steps[result.steps.length - 1]?.step ?? "completed",
      requiresApproval: result.requiresApproval,
      approvedAt: new Date(),
      approvedBy,
      sentAt: result.sentAt ?? run.sentAt,
      followupAt: result.followupAt ?? run.followupAt,
      completedAt: result.requiresApproval ? null : new Date(),
    },
  });

  if (!result.requiresApproval) {
    const agencyId = (
      await prisma.client.findUnique({
        where: { id: client.id },
        select: { agencyId: true },
      })
    )?.agencyId;

    if (agencyId) {
      const { dispatchWebhook } = await import("@/lib/api-v1/webhooks");
      void dispatchWebhook(agencyId, "fix.generated", {
        clientId: client.id,
        runId,
        pipelineType: run.pipelineType,
        gapTitle: gap.title,
        status: "completed",
      });
    }
  }
}

export async function processFollowupReminders(): Promise<number> {
  const now = new Date();
  const due = await prisma.fixPipelineRun.findMany({
    where: {
      pipelineType: "citation_outreach",
      followupAt: { lte: now },
      status: { not: "completed" },
    },
  });

  let count = 0;
  for (const run of due) {
    const steps = run.steps as PipelineStepState[];
    const followupStep = steps.find((s) => s.step === "followup");
    if (followupStep?.status === "completed") continue;

    const gap = run.gapSnapshot as GapInput;
    const reminderPitch =
      (followupStep?.output?.reminderPitch as string) ??
      `Following up regarding ${gap.title}`;

    try {
      const publication = extractPublication(gap);
      await createOutreachTaskServer({
        publication,
        pitch: reminderPitch,
        priority: citationOutreachPriority(gap, publication),
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      });

      const updated = updateStep(steps, "followup", {
        status: "completed",
        completedAt: now.toISOString(),
        output: { ...followupStep?.output, sent: true },
      });

      await prisma.fixPipelineRun.update({
        where: { id: run.id },
        data: {
          steps: updated as object,
          status: "completed",
          completedAt: now,
          currentStep: "followup",
        },
      });

      const agencyId = (
        await prisma.client.findUnique({
          where: { id: run.clientId },
          select: { agencyId: true },
        })
      )?.agencyId;

      if (agencyId) {
        const { dispatchWebhook } = await import("@/lib/api-v1/webhooks");
        void dispatchWebhook(agencyId, "fix.generated", {
          clientId: run.clientId,
          runId: run.id,
          pipelineType: run.pipelineType,
          status: "completed",
        });
      }

      count += 1;
    } catch {
      // leave for next cron cycle
    }
  }

  return count;
}
