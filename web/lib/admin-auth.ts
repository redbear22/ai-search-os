import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getSession } from "@/lib/session";

export async function requireAdminSession(): Promise<Session | NextResponse> {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session;
}
