export type PipelineType =
  | "citation_outreach"
  | "content_generation"
  | "entity_optimization";

export type CitationOutreachStep =
  | "research"
  | "draft"
  | "send"
  | "track"
  | "followup";

export type ContentGenerationStep =
  | "brief"
  | "draft"
  | "seo"
  | "review"
  | "publish";

export type EntityOptimizationStep =
  | "schema"
  | "deploy"
  | "validate"
  | "deploy_prod";

export type StepStatus = "pending" | "running" | "completed" | "awaiting_approval" | "failed";

export type PipelineStepState = {
  step: string;
  status: StepStatus;
  output?: Record<string, unknown>;
  completedAt?: string;
  error?: string;
};

export interface CitationOutreachPipeline {
  research: { publication: string; angle: string; contactHint: string };
  draft: { pitch: string; subject: string };
  send: { status: string; outreachId?: string };
  track: { opens: number; replies: number; lastChecked: string };
  followup: { reminderPitch: string; scheduledFor: string };
}

export interface ContentGenerationPipeline {
  brief: { objective: string; audience: string; keywords: string[] };
  draft: { title: string; body: string };
  seo: { metaTitle: string; metaDescription: string; keywords: string[] };
  review: { status: string; flags: string[] };
  publish: { status: string; cmsPostId?: string };
}

export interface EntityOptimizationPipeline {
  schema: { jsonLd: Record<string, unknown>; markup: string };
  deploy: { environment: string; url?: string };
  validate: { passed: boolean; issues: string[] };
  deploy_prod: { status: string; approved: boolean };
}

export interface AutomatedFixPipeline {
  citationOutreach: CitationOutreachPipeline;
  contentGeneration: ContentGenerationPipeline;
  entityOptimization: EntityOptimizationPipeline;
}

export type FixPipelineRunView = {
  id: string;
  clientId: string;
  gapId: string | null;
  pipelineType: PipelineType;
  status: string;
  currentStep: string;
  steps: PipelineStepState[];
  requiresApproval: boolean;
  approvedAt: string | null;
  createdAt: string;
  completedAt: string | null;
};
