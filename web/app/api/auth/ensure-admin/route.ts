import { NextResponse } from "next/server";
import { upsertAuthUser } from "@/lib/auth-user-lookup";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** One-time bootstrap: upsert an ADMIN/APPROVED user (Bearer CRON_SECRET or NEXTAUTH_SECRET). */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let email = "redbearseoservices@gmail.com";
  let role: "ADMIN" | "APPROVED" = "ADMIN";

  try {
    const body = (await request.json()) as { email?: string; role?: string };
    if (body.email?.trim()) email = body.email.trim();
    if (body.role === "APPROVED" || body.role === "ADMIN") role = body.role;
  } catch {
    // default email/role
  }

  const user = await upsertAuthUser(email, role);
  if (!user) {
    return NextResponse.json(
      { error: "Could not upsert user — check Supabase/Prisma configuration" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, user });
}
