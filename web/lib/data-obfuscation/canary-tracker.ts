import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/api-protection/rate-limit";
import { extractCanaryFromText } from "@/lib/data-obfuscation/canary";

const TTL_MS = 48 * 60 * 60 * 1000;

type IssuedCanary = {
  token: string;
  path?: string;
  ip?: string;
  issuedAt: number;
};

type CanaryStore = {
  issued: Map<string, IssuedCanary>;
};

const globalStore = globalThis as unknown as { __canaryStore?: CanaryStore };

function store(): CanaryStore {
  if (!globalStore.__canaryStore) {
    globalStore.__canaryStore = { issued: new Map() };
  }
  return globalStore.__canaryStore;
}

function pruneExpired(): void {
  const now = Date.now();
  const s = store();
  for (const [token, entry] of s.issued) {
    if (now - entry.issuedAt > TTL_MS) {
      s.issued.delete(token);
    }
  }
}

export function registerIssuedCanary(
  token: string,
  meta: { path?: string; ip?: string } = {}
): void {
  pruneExpired();
  store().issued.set(token, {
    token,
    path: meta.path,
    ip: meta.ip,
    issuedAt: Date.now(),
  });
}

export function wasCanaryIssued(token: string): boolean {
  pruneExpired();
  return store().issued.has(token);
}

async function persistCanaryLeak(event: {
  token: string;
  ip: string;
  source: string;
  path: string;
}): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.canaryLeak.create({
      data: {
        token: event.token,
        ip: event.ip,
        source: event.source,
        path: event.path,
      },
    });
  } catch {
    // DB optional during dev
  }
}

export function reportCanaryLeak(
  token: string,
  request: NextRequest,
  source: string
): void {
  if (!wasCanaryIssued(token)) return;

  const ip = getClientIp(request);
  const path = request.nextUrl.pathname;
  const event = { token, ip, source, path };

  console.warn("[canary-leak]", JSON.stringify(event));
  void persistCanaryLeak(event);
}

const SCAN_SOURCES = [
  "url",
  "referer",
  "user-agent",
  "x-forwarded-for",
  "x-obfuscation-sync",
] as const;

export function scanRequestForCanaryLeak(request: NextRequest): void {
  const candidates: Array<{ source: string; text: string }> = [
    { source: "url", text: request.url },
    { source: "referer", text: request.headers.get("referer") ?? "" },
    { source: "user-agent", text: request.headers.get("user-agent") ?? "" },
    {
      source: "x-forwarded-for",
      text: request.headers.get("x-forwarded-for") ?? "",
    },
    {
      source: "x-obfuscation-sync",
      text: request.headers.get("x-obfuscation-sync") ?? "",
    },
  ];

  for (const { source, text } of candidates) {
    if (!text) continue;
    const token = extractCanaryFromText(text);
    if (token) {
      reportCanaryLeak(token, request, source);
    }
  }

  for (const value of request.nextUrl.searchParams.values()) {
    const token = extractCanaryFromText(value);
    if (token) {
      reportCanaryLeak(token, request, "query");
    }
  }
}

export function resetCanaryTrackerForTesting(): void {
  globalStore.__canaryStore = { issued: new Map() };
}

export { SCAN_SOURCES };
