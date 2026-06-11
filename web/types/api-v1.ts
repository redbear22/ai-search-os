export type ApiV1ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "rate_limited"
  | "plan_required"
  | "internal_error";

export type ApiV1Error = {
  error: {
    code: ApiV1ErrorCode;
    message: string;
  };
};

export type ApiV1Success<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type WebhookEventType =
  | "audit.completed"
  | "gap.detected"
  | "fix.generated"
  | "client.health.changed";

export type WebhookPayload = {
  event: WebhookEventType;
  timestamp: string;
  agencyId: string;
  payload: Record<string, unknown>;
};

export type ApiKeyScope =
  | "clients:read"
  | "clients:write"
  | "audits:read"
  | "audits:write"
  | "reports:write"
  | "insights:read"
  | "automation:write"
  | "webhooks:write";

export type ApiV1AuthContext = {
  agencyId: string;
  apiKeyId?: string;
  oauthClientId?: string;
  scopes: ApiKeyScope[];
};

export type CreateClientRequest = {
  name: string;
  domain?: string;
};

export type CreateClientResponse = {
  id: string;
  name: string;
  domain: string | null;
  createdAt: string;
};

export type AuditRunResponse = {
  runId: string;
  status: "queued" | "running" | "completed" | "failed" | "pending";
};

export type CreateWebhookRequest = {
  url: string;
  events: WebhookEventType[];
  secret?: string;
};

export type ScheduleAutomationRequest = {
  clientId: string;
  frequency: "weekly" | "biweekly" | "monthly";
  enabled: boolean;
};

export type OAuthTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
};
