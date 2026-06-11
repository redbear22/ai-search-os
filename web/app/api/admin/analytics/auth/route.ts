import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsSecret } from "@/lib/analytics-auth";

const COOKIE_NAME = "analytics_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  const secret = getAnalyticsSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "ANALYTICS_SECRET is not configured in web/.env.local" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { key?: string };
    const key = body.key?.trim();

    if (!key || key !== secret) {
      return NextResponse.json({ error: "Invalid key" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
