import { checkAgentApiHealth } from "@/lib/agent-api";
import { isAuthConfigured } from "@/lib/auth";
import { loadRootEnvFallback } from "@/lib/load-root-env";
import { getPrisma } from "@/lib/prisma";

let rootEnvMerged = false;

function ensureEnvLoaded(): void {
  if (rootEnvMerged) return;
  loadRootEnvFallback();
  rootEnvMerged = true;
}
import type {
  ConnectivityResult,
  EnvServiceId,
  EnvVarStatus,
  ServiceDefinition,
} from "@/lib/env-diagnostics-types";

export type {
  ConnectivityResult,
  EnvServiceId,
  EnvSnapshot,
  EnvVarStatus,
  ServiceDefinition,
} from "@/lib/env-diagnostics-types";

function maskSecret(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

const ENV_PLACEHOLDERS = new Set([
  "your-gemini-key-here",
  "your-key-here",
  "your-nextauth-secret-here",
]);

function isConfiguredSecret(value: string | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return !ENV_PLACEHOLDERS.has(trimmed);
}

function secretVar(name: string, required = true): EnvVarStatus {
  const value = process.env[name];
  return {
    name,
    set: isConfiguredSecret(value),
    preview: maskSecret(value),
    required,
  };
}

function plainVar(name: string, required = true): EnvVarStatus {
  const value = process.env[name];
  return {
    name,
    set: Boolean(value?.trim()),
    value: value ?? null,
    required,
  };
}

function flagVar(name: string): EnvVarStatus {
  const value = process.env[name];
  return {
    name,
    set: value === "true",
    value: value ?? null,
    required: false,
  };
}

export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function getServiceDefinitions(): ServiceDefinition[] {
  ensureEnvLoaded();
  const trendsUrl =
    process.env.TRENDS_MCP_API_URL?.trim() ||
    process.env.TRENDS_MCP_URL?.trim() ||
    null;

  const openaiVars = [secretVar("OPENAI_API_KEY")];
  const perplexityVars = [
    secretVar("PERPLEXITY_API_KEY"),
    plainVar("PERPLEXITY_API_URL", false),
  ];
  const claudeVars = [
    secretVar("ANTHROPIC_API_KEY"),
    plainVar("ANTHROPIC_API_URL", false),
  ];
  const geminiVars = [
    secretVar("GOOGLE_GEMINI_API_KEY"),
    plainVar("GOOGLE_GEMINI_API_URL", false),
  ];
  const dataforseoVars = [
    plainVar("DATAFORSEO_LOGIN"),
    secretVar("DATAFORSEO_PASSWORD"),
    plainVar("DATAFORSEO_LOCATION_CODE"),
    plainVar("DATAFORSEO_LANGUAGE_CODE"),
  ];
  const trendsVars = [
    secretVar("TRENDS_MCP_API_KEY"),
    plainVar("TRENDS_MCP_API_URL", false),
    plainVar("TRENDS_MCP_URL", false),
  ];
  const agentVars = [
    flagVar("AGENT_API_ENABLED"),
    plainVar("AGENT_API_URL", false),
    secretVar("AGENT_API_KEY", false),
  ];
  const citationVars = [
    flagVar("CITATION_ENGINE_ENABLED"),
    plainVar("CITATION_ENGINE_URL", false),
  ];
  const keywordsEverywhereVars = [
    secretVar("KEYWORDS_EVERYWHERE_API_KEY"),
    plainVar("KEYWORDS_EVERYWHERE_API_URL", false),
    plainVar("KE_DEFAULT_COUNTRY", false),
    plainVar("KE_DEFAULT_CURRENCY", false),
  ];
  const keepaVars = [secretVar("KEEPA_API_KEY")];
  const gscVars = [
    flagVar("GSC_ENABLED"),
    plainVar("GOOGLE_GSC_CLIENT_ID", false),
    secretVar("GOOGLE_GSC_CLIENT_SECRET", false),
    secretVar("GOOGLE_GSC_REFRESH_TOKEN", false),
  ];
  const googleOAuthVars = [
    plainVar("DATABASE_URL"),
    plainVar("NEXTAUTH_URL"),
    secretVar("NEXTAUTH_SECRET"),
    plainVar("GOOGLE_CLIENT_ID"),
    secretVar("GOOGLE_CLIENT_SECRET"),
  ];

  const allRequiredSet = (vars: EnvVarStatus[]) =>
    vars.filter((v) => v.required).every((v) => v.set);

  return [
    {
      id: "openai",
      name: "OpenAI",
      description: "Clarity layer — ChatGPT tab (gpt-4o-mini)",
      envFile: "web/.env.local",
      vars: openaiVars,
      configured: allRequiredSet(openaiVars),
      optional: false,
    },
    {
      id: "perplexity",
      name: "Perplexity",
      description: "Clarity layer — Perplexity tab (sonar online)",
      envFile: "web/.env.local",
      vars: perplexityVars,
      configured: isConfiguredSecret(process.env.PERPLEXITY_API_KEY),
      optional: true,
    },
    {
      id: "claude",
      name: "Claude (Anthropic)",
      description: "Clarity layer — Claude tab",
      envFile: "web/.env.local",
      vars: claudeVars,
      configured: isConfiguredSecret(process.env.ANTHROPIC_API_KEY),
      optional: true,
    },
    {
      id: "gemini",
      name: "Google Gemini",
      description: "Clarity layer — Google AI tab",
      envFile: "web/.env.local",
      vars: geminiVars,
      configured: isConfiguredSecret(process.env.GOOGLE_GEMINI_API_KEY),
      optional: true,
    },
    {
      id: "dataforseo",
      name: "DataForSEO",
      description: "Discoverability / SERP data",
      envFile: "web/.env.local",
      vars: dataforseoVars,
      configured: allRequiredSet(dataforseoVars),
      optional: false,
    },
    {
      id: "trends",
      name: "Trends MCP",
      description: "Trend scores and content gap analysis",
      envFile: "web/.env.local",
      vars: trendsVars,
      configured: trendsVars[0].set && Boolean(trendsUrl),
      optional: false,
    },
    {
      id: "keywords_everywhere",
      name: "Keywords Everywhere",
      description: "Keyword volume, CPC, and competition (Discoverability)",
      envFile: "web/.env.local",
      vars: keywordsEverywhereVars,
      configured: allRequiredSet(keywordsEverywhereVars),
      optional: false,
    },
    {
      id: "keepa",
      name: "Keepa",
      description: "Amazon pricing, rank history, and product intelligence",
      envFile: "web/.env.local",
      vars: keepaVars,
      configured: keepaVars[0].set,
      optional: true,
    },
    {
      id: "gsc",
      name: "Google Search Console",
      description: "Search queries, impressions, and index coverage (OAuth)",
      envFile: "web/.env.local",
      vars: gscVars,
      configured:
        gscVars[0].set &&
        gscVars[1].set &&
        gscVars[2].set &&
        gscVars[3].set,
      optional: true,
    },
    {
      id: "google_oauth",
      name: "Google OAuth (NextAuth)",
      description: "Sign-in with Google — separate from Gemini / GSC keys",
      envFile: "web/.env.local",
      vars: googleOAuthVars,
      configured: isAuthConfigured(),
      optional: true,
    },
    {
      id: "agent",
      name: "Agent API",
      description: "Background audit jobs (disabled by default)",
      envFile: "web/.env.local",
      vars: agentVars,
      configured: agentVars[0].set,
      optional: true,
    },
    {
      id: "citation",
      name: "Citation Engine",
      description: "Authority import REST API (disabled by default)",
      envFile: "web/.env.local",
      vars: citationVars,
      configured: citationVars[0].set,
      optional: true,
    },
  ];
}

export function getEnvWarnings(services: ServiceDefinition[]): string[] {
  const warnings: string[] = [];

  for (const service of services) {
    if (service.optional) continue;
    if (!service.configured) {
      warnings.push(`${service.name}: required keys missing in ${service.envFile}`);
      continue;
    }
    const missing = service.vars.filter((v) => v.required && !v.set).map((v) => v.name);
    if (missing.length) {
      warnings.push(`${service.name}: missing ${missing.join(", ")}`);
    }
  }

  const trendsUrl =
    process.env.TRENDS_MCP_API_URL?.trim() || process.env.TRENDS_MCP_URL?.trim();
  if (process.env.TRENDS_MCP_API_KEY?.trim() && !trendsUrl) {
    warnings.push("Trends MCP: set TRENDS_MCP_API_URL or TRENDS_MCP_URL");
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl?.includes("127.0.0.1")) {
    warnings.push(
      "Google OAuth: NEXTAUTH_URL uses 127.0.0.1 — use http://localhost:3000 to avoid cookie/state mismatch"
    );
  }

  const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim();
  if (nextAuthSecret && ENV_PLACEHOLDERS.has(nextAuthSecret)) {
    warnings.push(
      "Google OAuth: NEXTAUTH_SECRET is still the placeholder from .env.example — generate a random secret"
    );
  }

  return warnings;
}

async function testOpenAI(): Promise<ConnectivityResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return { ok: false, message: "OPENAI_API_KEY not set", latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/models?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;

    if (res.status === 401) {
      return { ok: false, message: "Invalid API key (401)", latencyMs };
    }
    if (!res.ok) {
      return { ok: false, message: `API returned ${res.status}`, latencyMs };
    }

    return {
      ok: true,
      message: "Connected — models endpoint reachable",
      latencyMs,
      usage: {
        note: "Usage & billing: platform.openai.com/usage",
      },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testDataForSEO(): Promise<ConnectivityResult> {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) {
    return { ok: false, message: "DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD not set", latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const creds = Buffer.from(`${login}:${password}`).toString("base64");
    const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/json",
      },
      body: "[]",
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      return { ok: false, message: "Invalid credentials (401)", latencyMs };
    }
    if (!res.ok) {
      const errMsg =
        json && typeof json === "object" && "status_message" in json
          ? String((json as { status_message: string }).status_message)
          : `API returned ${res.status}`;
      return { ok: false, message: errMsg, latencyMs };
    }

    const usage: Record<string, string | number | null> = {};
    const tasks = Array.isArray(json?.tasks) ? json.tasks : [];
    const result = tasks[0]?.result?.[0];
    if (result && typeof result === "object") {
      const r = result as Record<string, unknown>;
      if ("money" in r) usage.balance = String(r.money);
      if ("total" in r) usage.totalSpent = String(r.total);
      if ("limits" in r) usage.limits = JSON.stringify(r.limits);
    }
    if (!Object.keys(usage).length) {
      usage.note = "Account reachable — see app.dataforseo.com for billing";
    }

    return {
      ok: true,
      message: "Connected — account data retrieved",
      latencyMs,
      usage,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testTrendsMCP(): Promise<ConnectivityResult> {
  const key = process.env.TRENDS_MCP_API_KEY?.trim();
  const base =
    process.env.TRENDS_MCP_API_URL?.trim() ||
    process.env.TRENDS_MCP_URL?.trim() ||
    "https://api.trendsmcp.ai/api";
  const url = base.endsWith("/api") ? base : `${base.replace(/\/$/, "")}/api`;

  if (!key) {
    return { ok: false, message: "TRENDS_MCP_API_KEY not set", latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "google search",
        keyword: "coffee",
        data_mode: "weekly",
      }),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Invalid API key (${res.status})`, latencyMs };
    }
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: text || `API returned ${res.status}`, latencyMs };
    }

    return {
      ok: true,
      message: "Connected — sample trend request succeeded (uses 1 quota unit)",
      latencyMs,
      usage: {
        plan: "Free tier: 100 requests/month",
        note: "No usage API — track at trendsmcp.ai dashboard",
      },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testPerplexity(): Promise<ConnectivityResult> {
  const key = process.env.PERPLEXITY_API_KEY?.trim();
  const base =
    process.env.PERPLEXITY_API_URL?.trim().replace(/\/$/, "") ||
    "https://api.perplexity.ai";

  if (!key) {
    return { ok: false, message: "PERPLEXITY_API_KEY not set", latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: "Reply with OK only." }],
        max_tokens: 16,
        temperature: 0,
      }),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Invalid API key (${res.status})`, latencyMs };
    }
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: text || `API returned ${res.status}`, latencyMs };
    }

    return {
      ok: true,
      message: "Connected — chat completions reachable",
      latencyMs,
      usage: { note: "Billing: perplexity.ai/settings/api" },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testClaude(): Promise<ConnectivityResult> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const base =
    process.env.ANTHROPIC_API_URL?.trim().replace(/\/$/, "") ||
    "https://api.anthropic.com/v1";

  if (!key) {
    return { ok: false, message: "ANTHROPIC_API_KEY not set", latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${base}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 16,
        messages: [{ role: "user", content: "Reply with OK only." }],
      }),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Invalid API key (${res.status})`, latencyMs };
    }
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: text || `API returned ${res.status}`, latencyMs };
    }

    return {
      ok: true,
      message: "Connected — messages API reachable",
      latencyMs,
      usage: { note: "Billing: console.anthropic.com" },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testGemini(): Promise<ConnectivityResult> {
  const key = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  const base =
    process.env.GOOGLE_GEMINI_API_URL?.trim().replace(/\/$/, "") ||
    "https://generativelanguage.googleapis.com/v1beta";

  if (!isConfiguredSecret(key)) {
    return { ok: false, message: "GOOGLE_GEMINI_API_KEY not set", latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const model = process.env.GOOGLE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const url = `${base}/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with OK only." }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0 },
      }),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Invalid API key (${res.status})`, latencyMs };
    }
    if (res.status === 429) {
      return {
        ok: true,
        message: "Key accepted — quota exceeded (enable billing or retry later)",
        latencyMs,
        usage: { note: "Billing: aistudio.google.com" },
      };
    }
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: text || `API returned ${res.status}`, latencyMs };
    }

    return {
      ok: true,
      message: "Connected — generateContent reachable",
      latencyMs,
      usage: { note: "Billing: aistudio.google.com" },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testAgentApi(): Promise<ConnectivityResult> {
  if (process.env.AGENT_API_ENABLED !== "true") {
    return {
      ok: false,
      message: "Disabled — set AGENT_API_ENABLED=true to test",
      latencyMs: 0,
      usage: { status: "mock mode (default)" },
    };
  }

  const start = Date.now();
  const healthy = await checkAgentApiHealth();
  const latencyMs = Date.now() - start;
  const url = process.env.AGENT_API_URL || "http://localhost:8787";

  if (!healthy) {
    return {
      ok: false,
      message: `Unreachable at ${url}/health`,
      latencyMs,
    };
  }

  return {
    ok: true,
    message: `Healthy at ${url}`,
    latencyMs,
    usage: { status: "enabled" },
  };
}

async function testKeywordsEverywhere(): Promise<ConnectivityResult> {
  const key = process.env.KEYWORDS_EVERYWHERE_API_KEY?.trim();
  const base =
    process.env.KEYWORDS_EVERYWHERE_API_URL?.trim() ||
    "https://api.keywordseverywhere.com/v1";

  if (!key) {
    return { ok: false, message: "KEYWORDS_EVERYWHERE_API_KEY not set", latencyMs: 0 };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/account/credits`, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    const json = await res.json().catch(() => null);

    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Invalid API key (${res.status})`, latencyMs };
    }
    if (!res.ok) {
      return {
        ok: false,
        message:
          json && typeof json === "object" && "message" in json
            ? String((json as { message: string }).message)
            : `API returned ${res.status}`,
        latencyMs,
      };
    }

    const usage: Record<string, string | number | null> = {
      note: "Credits are prepaid and do not expire",
    };
    if (json && typeof json === "object") {
      const data = json as Record<string, unknown>;
      if ("credits" in data) usage.creditsRemaining = String(data.credits);
      if ("total_credits" in data) usage.totalCredits = String(data.total_credits);
    }

    return {
      ok: true,
      message: "Connected — account credits retrieved",
      latencyMs,
      usage,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testKeepa(): Promise<ConnectivityResult> {
  const key = process.env.KEEPA_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      message: "KEEPA_API_KEY not set — add to web/.env.local",
      latencyMs: 0,
      usage: { note: "Get a key at keepa.com/#!api" },
    };
  }

  const start = Date.now();
  try {
    const res = await fetch(`https://api.keepa.com/token?key=${encodeURIComponent(key)}`, {
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    const json = await res.json().catch(() => null);

    if (!res.ok || (json && typeof json === "object" && "error" in json)) {
      const errMsg =
        json && typeof json === "object" && "error" in json
          ? String((json as { error: unknown }).error)
          : `API returned ${res.status}`;
      return { ok: false, message: errMsg, latencyMs };
    }

    const usage: Record<string, string | number | null> = {};
    if (json && typeof json === "object") {
      const data = json as Record<string, unknown>;
      if ("tokensLeft" in data) usage.tokensLeft = Number(data.tokensLeft);
      if ("refillIn" in data) usage.refillInMs = Number(data.refillIn);
      if ("refillRate" in data) usage.refillRate = Number(data.refillRate);
    }

    return {
      ok: true,
      message: "Connected — token balance retrieved",
      latencyMs,
      usage,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testGsc(): Promise<ConnectivityResult> {
  if (process.env.GSC_ENABLED !== "true") {
    return {
      ok: false,
      message: "Disabled — set GSC_ENABLED=true and complete OAuth setup",
      latencyMs: 0,
      usage: { status: "planned (see docs/ROADMAP.md)", note: "GSC OAuth + query cache" },
    };
  }

  const clientId = process.env.GOOGLE_GSC_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_GSC_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_GSC_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      ok: false,
      message: "Missing GOOGLE_GSC_CLIENT_ID, GOOGLE_GSC_CLIENT_SECRET, or GOOGLE_GSC_REFRESH_TOKEN",
      latencyMs: 0,
    };
  }

  const start = Date.now();
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg =
        json && typeof json === "object" && "error_description" in json
          ? String((json as { error_description: string }).error_description)
          : `OAuth returned ${res.status}`;
      return { ok: false, message: errMsg, latencyMs };
    }

    return {
      ok: true,
      message: "Connected — OAuth refresh token valid",
      latencyMs,
      usage: {
        status: "enabled",
        note: "Query cache not wired in UI yet",
      },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testGoogleOAuth(): Promise<ConnectivityResult> {
  if (!isAuthConfigured()) {
    return {
      ok: false,
      message:
        "Missing DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, or GOOGLE_CLIENT_SECRET",
      latencyMs: 0,
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!.trim();
  const nextAuthUrl =
    process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";

  const start = Date.now();
  const usage: Record<string, string | number | null> = {};

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: "env-check-probe",
      grant_type: "refresh_token",
    });
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    const tokenJson = await tokenRes.json().catch(() => null);

    if (tokenJson && typeof tokenJson === "object" && "error" in tokenJson) {
      const err = String((tokenJson as { error: string }).error);
      if (err === "invalid_client") {
        return {
          ok: false,
          message: "Invalid GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET",
          latencyMs: Date.now() - start,
        };
      }
      if (err !== "invalid_grant") {
        const errMsg =
          "error_description" in tokenJson
            ? String((tokenJson as { error_description: string }).error_description)
            : err;
        return { ok: false, message: errMsg, latencyMs: Date.now() - start };
      }
      usage.oauthClient = "valid (credentials accepted by Google)";
    } else if (!tokenRes.ok) {
      return {
        ok: false,
        message: `OAuth token endpoint returned ${tokenRes.status}`,
        latencyMs: Date.now() - start,
      };
    }

    try {
      const providersRes = await fetch(`${nextAuthUrl}/api/auth/providers`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (providersRes.ok) {
        const providers = await providersRes.json().catch(() => null);
        usage.nextAuthProviders =
          providers && typeof providers === "object" && "google" in providers
            ? "google listed"
            : "google not listed";
      } else {
        usage.nextAuthProviders = `endpoint returned ${providersRes.status}`;
      }
    } catch {
      usage.nextAuthProviders = `unreachable at ${nextAuthUrl}`;
    }

    try {
      await getPrisma().user.count();
      usage.database = "reachable";
    } catch (err) {
      return {
        ok: false,
        message: "OAuth client valid but database query failed",
        latencyMs: Date.now() - start,
        usage: {
          ...usage,
          database: err instanceof Error ? err.message : "query failed",
        },
      };
    }

    const latencyMs = Date.now() - start;
    return {
      ok: true,
      message: "Configured — OAuth client valid, NextAuth reachable, database OK",
      latencyMs,
      usage: {
        ...usage,
        redirectUri: `${nextAuthUrl}/api/auth/callback/google`,
      },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function testCitationEngine(): Promise<ConnectivityResult> {
  if (process.env.CITATION_ENGINE_ENABLED !== "true") {
    return {
      ok: false,
      message: "Disabled — set CITATION_ENGINE_ENABLED=true to test",
      latencyMs: 0,
      usage: { status: "mock mode (default)" },
    };
  }

  const base = process.env.CITATION_ENGINE_URL ?? "http://localhost:8501";
  const start = Date.now();

  try {
    const res = await fetch(`${base}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return {
        ok: false,
        message: `Health check returned ${res.status}`,
        latencyMs,
      };
    }

    return {
      ok: true,
      message: `Healthy at ${base}`,
      latencyMs,
      usage: { status: "enabled" },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

export async function testServiceConnectivity(
  serviceId: EnvServiceId
): Promise<ConnectivityResult> {
  ensureEnvLoaded();
  switch (serviceId) {
    case "openai":
      return testOpenAI();
    case "perplexity":
      return testPerplexity();
    case "claude":
      return testClaude();
    case "gemini":
      return testGemini();
    case "dataforseo":
      return testDataForSEO();
    case "trends":
      return testTrendsMCP();
    case "keywords_everywhere":
      return testKeywordsEverywhere();
    case "keepa":
      return testKeepa();
    case "gsc":
      return testGsc();
    case "google_oauth":
      return testGoogleOAuth();
    case "agent":
      return testAgentApi();
    case "citation":
      return testCitationEngine();
    default:
      return { ok: false, message: "Unknown service", latencyMs: 0 };
  }
}

export function getEnvSnapshot() {
  const services = getServiceDefinitions();
  return {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    source: "web/.env.local",
    trendsUrl:
      process.env.TRENDS_MCP_API_URL?.trim() ||
      process.env.TRENDS_MCP_URL?.trim() ||
      null,
    services,
    warnings: getEnvWarnings(services),
    ready: {
      clarity: services.find((s) => s.id === "openai")?.configured ?? false,
      perplexity: services.find((s) => s.id === "perplexity")?.configured ?? false,
      claude: services.find((s) => s.id === "claude")?.configured ?? false,
      gemini: services.find((s) => s.id === "gemini")?.configured ?? false,
      dataforseo: services.find((s) => s.id === "dataforseo")?.configured ?? false,
      trends: services.find((s) => s.id === "trends")?.configured ?? false,
      keywordsEverywhere:
        services.find((s) => s.id === "keywords_everywhere")?.configured ?? false,
      keepa: services.find((s) => s.id === "keepa")?.configured ?? false,
      gsc: services.find((s) => s.id === "gsc")?.configured ?? false,
      auth: services.find((s) => s.id === "google_oauth")?.configured ?? false,
    },
  };
}
