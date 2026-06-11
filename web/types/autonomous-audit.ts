export type AuditTriggerType =
  | "schedule"
  | "citation_spike"
  | "platform_release"
  | "domain_change"
  | "webhook";

export type AuditFrequency = "weekly" | "biweekly" | "monthly";

export type AutonomousAuditConfigView = {
  enabled: boolean;
  auditFrequency: AuditFrequency;
  optimizedFrequency: AuditFrequency | null;
  nextAuditAt: string | null;
  lastAuditAt: string | null;
  triggers: {
    citationSpike: boolean;
    platformRelease: boolean;
    domainChange: boolean;
    webhook: boolean;
  };
  autoAssign: boolean;
  notifyClient: boolean;
  webhookUrl: string | null;
};

export type PrioritizedGap = {
  title: string;
  layer: string;
  severity: string;
  impactScore: number;
  predictedValue: number;
  suggestedOwner: string;
};

export type AutonomousIntelligence = {
  topPredictedGaps: string[];
  recommendedFrequency: AuditFrequency;
  fixPatterns: { pattern: string; successRate: number }[];
};

export type AutonomousAuditRunSummary = {
  id: string;
  triggerType: AuditTriggerType;
  status: string;
  gapsDetected: number;
  gapsAssigned: number;
  notifiedClient: boolean;
  startedAt: string;
  completedAt: string | null;
  intelligence: AutonomousIntelligence | null;
};
