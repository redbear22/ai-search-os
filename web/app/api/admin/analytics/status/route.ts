import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ANALYTICS_ADMIN_COOKIE,
  isAnalyticsAuthorized,
  isAnalyticsConfigured,
} from "@/lib/analytics-auth";

export async function GET() {
  const cookieStore = await cookies();
  const configured = isAnalyticsConfigured();

  return NextResponse.json({
    configured,
    authorized: isAnalyticsAuthorized({
      sessionCookie: cookieStore.get(ANALYTICS_ADMIN_COOKIE)?.value ?? null,
    }),
  });
}
