import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  cacheGscProperties,
  fetchGscProperties,
  getValidGscAccessToken,
  isGscOAuthConfigured,
  type GscProperty,
} from "@/lib/gsc-client";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGscOAuthConfigured()) {
    return NextResponse.json({
      connected: false,
      properties: [] as GscProperty[],
      message: "Connect Google Search Console to see your properties",
    });
  }

  const conn = await prisma.gscConnection.findUnique({
    where: { userId: session.user.id },
  });

  if (!conn) {
    return NextResponse.json({
      connected: false,
      properties: [] as GscProperty[],
      message: "Connect Google Search Console to see your properties",
    });
  }

  const accessToken = await getValidGscAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json(
      {
        connected: false,
        properties: [] as GscProperty[],
        message: "GSC session expired — please reconnect",
        needsReauth: true,
      },
      { status: 401 }
    );
  }

  try {
    const properties = await fetchGscProperties(accessToken);
    await cacheGscProperties(session.user.id, properties);
    return NextResponse.json({ connected: true, properties });
  } catch {
    const cached = (conn.properties as GscProperty[] | null) ?? [];
    return NextResponse.json({ connected: true, properties: cached, stale: true });
  }
}
