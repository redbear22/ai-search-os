import { NextResponse } from "next/server";
import { getBasePrisma, getDatabaseUrl, normalizeDatabaseUrlForRuntime } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  const resolved = getDatabaseUrl();

  let host = "missing";
  let port = "missing";
  try {
    const parsed = new URL(resolved);
    host = parsed.hostname;
    port = parsed.port || "5432";
  } catch {
    // ignore
  }

  try {
    const userCount = await getBasePrisma().user.count();
    const admin = await getBasePrisma().user.findFirst({
      where: { email: { equals: "redbearseoservices@gmail.com", mode: "insensitive" } },
      select: { email: true, role: true },
    });

    return NextResponse.json({
      ok: true,
      configured: Boolean(resolved),
      host,
      port,
      normalizedFromSessionPooler:
        Boolean(raw) && normalizeDatabaseUrlForRuntime(raw) !== raw,
      userCount,
      admin,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: Boolean(resolved),
        host,
        port,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
