"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ANALYTICS_ADMIN_COOKIE,
  getAnalyticsSecret,
} from "@/lib/analytics-auth";

export type UnlockAnalyticsState = {
  error?: string;
};

export async function unlockAnalyticsDashboard(
  _prevState: UnlockAnalyticsState | null,
  formData: FormData
): Promise<UnlockAnalyticsState | null> {
  const secret = getAnalyticsSecret();
  const key = String(formData.get("key") ?? "").trim();

  if (!secret) {
    return {
      error:
        "ANALYTICS_SECRET is missing from web/.env.local — add it and restart npm run dev.",
    };
  }

  if (!key || key !== secret) {
    return {
      error:
        "Invalid key. Copy ANALYTICS_SECRET exactly from web/.env.local (not repo-root .env.local).",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(ANALYTICS_ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/admin/analytics");
}
