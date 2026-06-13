import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  fetchGscQueries,
  getValidGscAccessToken,
  isGscOAuthConfigured,
} from "@/lib/gsc-client";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteUrl = searchParams.get("siteUrl")?.trim();
  const days = Math.min(90, Math.max(7, Number(searchParams.get("days") ?? 30)));

  if (!isGscOAuthConfigured()) {
    return NextResponse.json({
      connected: false,
      rows: [],
      message: "Connect Google Search Console to import query data",
    });
  }

  if (!siteUrl) {
    return NextResponse.json({ error: "siteUrl query param required" }, { status: 400 });
  }

  const accessToken = await getValidGscAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json({
      connected: false,
      rows: [],
      message: "GSC not connected or token expired",
      needsReauth: true,
    });
  }

  try {
    const rows = await fetchGscQueries(accessToken, siteUrl, days);
    return NextResponse.json({ connected: true, rows, siteUrl, days });
  } catch (err) {
    return NextResponse.json({
      connected: true,
      rows: [],
      error: err instanceof Error ? err.message : "Query fetch failed",
    });
  }
}
