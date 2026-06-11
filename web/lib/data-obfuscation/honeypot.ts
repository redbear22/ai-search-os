import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyJitter } from "@/lib/api-protection/jitter";
import { getClientIp } from "@/lib/api-protection/rate-limit";
import { embedCanary } from "@/lib/data-obfuscation/canary";

export const HONEYPOT_PATHS = [
  "/api/admin/debug",
  "/api/internal/stats",
  "/api/v2",
] as const;

const BLOCK_THRESHOLD = 3;

type HoneypotStore = {
  attempts: Map<string, number>;
  blocked: Set<string>;
  events: Array<{
    ip: string;
    path: string;
    userAgent: string | null;
    at: string;
    blocked: boolean;
  }>;
};

const globalStore = globalThis as unknown as { __honeypotStore?: HoneypotStore };

function store(): HoneypotStore {
  if (!globalStore.__honeypotStore) {
    globalStore.__honeypotStore = {
      attempts: new Map(),
      blocked: new Set(),
      events: [],
    };
  }
  return globalStore.__honeypotStore;
}

export function isHoneypotPath(pathname: string): boolean {
  return HONEYPOT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function isIpBlocked(ip: string): boolean {
  return store().blocked.has(ip);
}

export function recordHoneypotHit(
  ip: string,
  path: string,
  userAgent: string | null
): { attempts: number; blocked: boolean } {
  const s = store();
  const next = (s.attempts.get(ip) ?? 0) + 1;
  s.attempts.set(ip, next);

  const blocked = next >= BLOCK_THRESHOLD;
  if (blocked) {
    s.blocked.add(ip);
  }

  const event = {
    ip,
    path,
    userAgent,
    at: new Date().toISOString(),
    blocked,
  };
  s.events.push(event);
  if (s.events.length > 500) {
    s.events.splice(0, s.events.length - 500);
  }

  console.warn("[honeypot]", JSON.stringify(event));

  return { attempts: next, blocked };
}

export async function persistHoneypotEvent(event: {
  ip: string;
  path: string;
  userAgent: string | null;
  blocked: boolean;
}): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const { generateRecordId } = await import("@/lib/ids");
    await prisma.honeypotEvent.create({
      data: {
        id: generateRecordId(),
        ip: event.ip,
        path: event.path,
        userAgent: event.userAgent,
        blocked: event.blocked,
      },
    });
    if (event.blocked) {
      await prisma.blockedIp.upsert({
        where: { ip: event.ip },
        create: {
          id: generateRecordId(),
          ip: event.ip,
          reason: "honeypot_threshold",
          hitCount: BLOCK_THRESHOLD,
        },
        update: {
          hitCount: { increment: 1 },
          reason: "honeypot_threshold",
        },
      });
    }
  } catch {
    // DB optional during dev / edge
  }
}

export function getHoneypotEvents(limit = 50) {
  return store().events.slice(-limit).reverse();
}

function fakeAdminDebug() {
  return embedCanary({
    success: true,
    environment: "production",
    debug: {
      version: "2.4.1",
      workers: 4,
      queueDepth: 12,
      featureFlags: { autonomousAudit: true, enterpriseApi: true },
    },
  });
}

function fakeInternalStats() {
  return embedCanary({
    success: true,
    stats: {
      activeTenants: 1284,
      auditsToday: 9421,
      avgLatencyMs: 183,
      errorRate: 0.0021,
    },
  });
}

function fakeV2Api() {
  return embedCanary({
    success: true,
    api: "v2",
    status: "deprecated_preview",
    endpoints: ["/clients", "/audits", "/reports", "/automation"],
  });
}

export function honeypotPayload(pathname: string): Record<string, unknown> {
  if (pathname.startsWith("/api/internal/stats")) return fakeInternalStats();
  if (pathname.startsWith("/api/v2")) return fakeV2Api();
  return fakeAdminDebug();
}

export async function handleHoneypotRequest(
  request: NextRequest
): Promise<NextResponse> {
  const ip = getClientIp(request);
  const path = request.nextUrl.pathname;

  if (isIpBlocked(ip)) {
    return NextResponse.json(
      { error: "Forbidden", code: "blocked" },
      { status: 403 }
    );
  }

  await applyJitter();

  const userAgent = request.headers.get("user-agent");
  const hit = recordHoneypotHit(ip, path, userAgent);

  void persistHoneypotEvent({
    ip,
    path,
    userAgent,
    blocked: hit.blocked,
  }).catch(() => undefined);

  if (hit.blocked) {
    return NextResponse.json(
      { error: "Forbidden", code: "blocked" },
      { status: 403 }
    );
  }

  return NextResponse.json(honeypotPayload(path), {
    status: pathnameLooksAdmin(path) ? 401 : 200,
  });
}

function pathnameLooksAdmin(path: string): boolean {
  return path.startsWith("/api/admin/");
}

export function resetHoneypotForTesting(): void {
  globalStore.__honeypotStore = {
    attempts: new Map(),
    blocked: new Set(),
    events: [],
  };
}

export async function syncBlockedIpsFromDatabase(): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.blockedIp.findMany({ select: { ip: true } });
    const s = store();
    for (const row of rows) {
      s.blocked.add(row.ip);
      s.attempts.set(row.ip, BLOCK_THRESHOLD);
    }
  } catch {
    // ignore during bootstrap
  }
}
