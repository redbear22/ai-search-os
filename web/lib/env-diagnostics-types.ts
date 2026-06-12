export type EnvServiceId =
  | "openai"
  | "perplexity"
  | "claude"
  | "gemini"
  | "dataforseo"
  | "trends"
  | "keywords_everywhere"
  | "keepa"
  | "gsc"
  | "google_oauth"
  | "agent"
  | "citation"
  | "upstash";

export interface EnvVarStatus {
  name: string;
  set: boolean;
  preview?: string | null;
  value?: string | null;
  required: boolean;
}

export interface ServiceDefinition {
  id: EnvServiceId;
  name: string;
  description: string;
  envFile: string;
  vars: EnvVarStatus[];
  configured: boolean;
  optional: boolean;
}

export interface ConnectivityResult {
  ok: boolean;
  message: string;
  latencyMs: number;
  usage?: Record<string, string | number | null>;
}

export interface EnvSnapshot {
  nodeEnv: string;
  source: string;
  trendsUrl: string | null;
  services: ServiceDefinition[];
  warnings: string[];
  ready: Record<string, boolean>;
}
