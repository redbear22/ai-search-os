import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/token-encryption";

export const GSC_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

export type GscProperty = {
  siteUrl: string;
  permissionLevel: string;
};

export type GscQueryRow = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function gscConfig() {
  const clientId = process.env.GOOGLE_GSC_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_GSC_CLIENT_SECRET?.trim();
  const enabled = process.env.GSC_ENABLED === "true";
  return { clientId, clientSecret, enabled };
}

export function isGscOAuthConfigured(): boolean {
  const { clientId, clientSecret, enabled } = gscConfig();
  return enabled && Boolean(clientId && clientSecret);
}

export function gscRedirectUri(): string {
  const base =
    process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/api/gsc/callback`;
}

export function buildGscAuthUrl(state: string): string {
  const { clientId } = gscConfig();
  if (!clientId) throw new Error("GOOGLE_GSC_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: gscRedirectUri(),
    response_type: "code",
    scope: GSC_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const { clientId, clientSecret } = gscConfig();
  if (!clientId || !clientSecret) throw new Error("GSC OAuth not configured");

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

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(json.error ?? "Token refresh failed");
  }

  const expiresIn = json.expires_in ?? 3600;
  return {
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

export async function getValidGscAccessToken(userId: string): Promise<string | null> {
  const conn = await prisma.gscConnection.findUnique({ where: { userId } });
  if (!conn) return null;

  if (conn.expiresAt.getTime() > Date.now() + 60_000) {
    return decryptToken(conn.accessToken);
  }

  try {
    const refreshToken = decryptToken(conn.refreshToken);
    const refreshed = await refreshAccessToken(refreshToken);
    await prisma.gscConnection.update({
      where: { userId },
      data: {
        accessToken: encryptToken(refreshed.accessToken),
        expiresAt: refreshed.expiresAt,
      },
    });
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export async function exchangeGscCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const { clientId, clientSecret } = gscConfig();
  if (!clientId || !clientSecret) throw new Error("GSC OAuth not configured");

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: gscRedirectUri(),
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(json.error ?? "Token exchange failed");
  }
  if (!json.refresh_token) {
    throw new Error("No refresh token — revoke app access and reconnect with prompt=consent");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
  };
}

export async function fetchGscProperties(accessToken: string): Promise<GscProperty[]> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `GSC sites API ${res.status}`);
  }

  const json = (await res.json()) as {
    siteEntry?: { siteUrl: string; permissionLevel: string }[];
  };

  return (json.siteEntry ?? []).map((s) => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel,
  }));
}

export async function fetchGscQueries(
  accessToken: string,
  siteUrl: string,
  days = 30
): Promise<GscQueryRow[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const encodedSite = encodeURIComponent(siteUrl);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: ["query", "page"],
        rowLimit: 100,
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `GSC analytics API ${res.status}`);
  }

  const json = (await res.json()) as {
    rows?: {
      keys: string[];
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }[];
  };

  return (json.rows ?? []).map((row) => ({
    query: row.keys[0] ?? "",
    page: row.keys[1] ?? "",
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

export async function cacheGscProperties(userId: string, properties: GscProperty[]) {
  await prisma.gscConnection.update({
    where: { userId },
    data: { properties },
  });
}
