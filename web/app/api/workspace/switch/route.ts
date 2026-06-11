import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_CLIENT_COOKIE,
  requireAgencyAccess,
} from "@/lib/workspace";

export async function POST(request: Request) {
  const access = await requireAgencyAccess();
  if (access instanceof NextResponse) return access;

  let body: { clientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientId = body.clientId?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  if (access.agencyRole === "CLIENT_VIEWER" && access.clientId !== clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: access.agencyId },
    select: { id: true, name: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CLIENT_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({
    ok: true,
    activeClientId: client.id,
    clientName: client.name,
  });
}
