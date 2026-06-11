import { NextResponse } from "next/server";
import { getEnvSnapshot, isDevEnvironment } from "@/lib/env-diagnostics";

export async function GET() {
  if (!isDevEnvironment()) {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const snapshot = getEnvSnapshot();
  return NextResponse.json({
    ok: snapshot.warnings.length === 0,
    ...snapshot,
  });
}
