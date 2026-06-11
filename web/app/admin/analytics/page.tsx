import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { AnalyticsAuthGate } from "@/components/admin/analytics-auth-gate";
import {
  ANALYTICS_ADMIN_COOKIE,
  isAnalyticsAuthorized,
  isAnalyticsConfigured,
} from "@/lib/analytics-auth";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const params = await searchParams;
  const headersList = await headers();
  const cookieStore = await cookies();
  const configured = isAnalyticsConfigured();
  const authorized = isAnalyticsAuthorized({
    queryKey: params.key ?? null,
    authHeader: headersList.get("authorization"),
    sessionCookie: cookieStore.get(ANALYTICS_ADMIN_COOKIE)?.value ?? null,
  });

  if (!authorized) {
    return (
      <Suspense
        fallback={
          <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        }
      >
        <AnalyticsAuthGate configured={configured} />
      </Suspense>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-8">
      <AnalyticsDashboard />
    </div>
  );
}
