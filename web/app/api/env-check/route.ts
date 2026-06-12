import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getEnvSnapshot } from "@/lib/env-diagnostics";

export async function GET() {
  const authResult = await requireAdminSession();
  if (authResult instanceof NextResponse) return authResult;

  const snapshot = getEnvSnapshot();
  return NextResponse.json({
    ok: snapshot.warnings.length === 0,
    ...snapshot,
  });
}
