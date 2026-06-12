import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { geolocation, ipAddress } from "@vercel/functions";
import { getToken } from "next-auth/jwt";
import { hasRecentFreeAudit } from "@/lib/abuse-tracking";
import { logApiAccessStructured } from "@/lib/api-protection/access-log-edge";
import { validateApiAuthAtEdge } from "@/lib/api-protection/auth-edge";
import {
  isApiPath,
  isPublicApiPath,
  isRateLimitedPublicApiPath,
} from "@/lib/api-protection/config";
import { applyJitter } from "@/lib/api-protection/jitter";
import { checkIpRateLimit } from "@/lib/api-protection/rate-limit";
import {
  handleHoneypotRequest,
  isHoneypotPath,
  isIpBlocked,
} from "@/lib/data-obfuscation/honeypot";
import { isProductionSecurityEnabled } from "@/lib/api-protection/dev";
import { scanRequestForCanaryLeak } from "@/lib/data-obfuscation/canary-tracker";
import { getClientIp } from "@/lib/api-protection/rate-limit";
import { rateLimitByIp } from "@/lib/rate-limit";

const BLOCKED_COUNTRIES = ["KP", "IR", "SY", "CU"] as const;

function isDocumentNavigation(request: NextRequest): boolean {
  const dest = request.headers.get("sec-fetch-dest");
  if (dest === "document") return true;
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/contact" ||
    pathname === "/pricing" ||
    pathname === "/free-audit" ||
    pathname === "/sample-audit" ||
    pathname.startsWith("/portal/") ||
    pathname.startsWith("/api/client/") ||
    pathname.startsWith("/auth/signin") ||
    pathname.startsWith("/auth/error") ||
    pathname.startsWith("/admin/analytics") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/admin/analytics") ||
    pathname.startsWith("/api/analytics/track") ||
    pathname.startsWith("/api/v1/oauth/token") ||
    pathname === "/api/v1/openapi.json" ||
    (pathname.startsWith("/api/v1/") &&
      !pathname.startsWith("/api/v1/keys") &&
      !pathname.startsWith("/api/v1/oauth/clients"))
  );
}

// TODO: Custom domain routing — when AgencyBranding.customDomain is set, map host
// (e.g. reports.agency.com) to the agency portal/reports. Requires DNS CNAME +
// middleware host lookup against AgencyBranding.customDomain before auth redirect.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fast-path NextAuth and other public API routes (no jitter, no DB imports).
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const vercelIp = ipAddress(request) ?? ip;
  const { country } = geolocation(request);

  if (country && BLOCKED_COUNTRIES.includes(country as (typeof BLOCKED_COUNTRIES)[number])) {
    return new NextResponse("Access from your region is not available", { status: 403 });
  }

  if (pathname === "/free-audit" && (await hasRecentFreeAudit(vercelIp, { edge: true }))) {
    return NextResponse.redirect(new URL("/pricing?message=free-audit-used", request.url));
  }

  if (pathname === "/api/audit/free") {
    const { success } = await rateLimitByIp(request);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "rate_limited" },
        { status: 429 }
      );
    }
  }

  if (isProductionSecurityEnabled()) {
    scanRequestForCanaryLeak(request);
  }

  if (isIpBlocked(ip)) {
    return NextResponse.json(
      { error: "Forbidden", code: "blocked" },
      { status: 403 }
    );
  }

  if (isHoneypotPath(pathname)) {
    return handleHoneypotRequest(request);
  }

  const rateLimitApi =
    (isApiPath(pathname) && !isPublicApiPath(pathname)) ||
    isRateLimitedPublicApiPath(pathname);

  if (rateLimitApi) {
    const rateLimited = await checkIpRateLimit(request);
    if (rateLimited) {
      logApiAccessStructured({
        request,
        authType: "anonymous",
        status: 429,
      });
      return rateLimited;
    }
  }

  if (isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  if (isApiPath(pathname) && !isPublicApiPath(pathname)) {
    if (isProductionSecurityEnabled()) {
      await applyJitter();
    }

    if (!process.env.NEXTAUTH_SECRET?.trim()) {
      return NextResponse.json(
        {
          error: "API authentication is not configured (NEXTAUTH_SECRET missing).",
          code: "misconfigured",
        },
        { status: 503 }
      );
    }

    const hasSessionCookie =
      request.cookies.has("next-auth.session-token") ||
      request.cookies.has("__Secure-next-auth.session-token");

    const authed =
      !isProductionSecurityEnabled() && hasSessionCookie
        ? true
        : await validateApiAuthAtEdge(request);

    if (!authed) {
      logApiAccessStructured({
        request,
        authType: "anonymous",
        status: 401,
      });
      return NextResponse.json(
        {
          error:
            "Unauthorized API request. Sign in, or send Authorization: Bearer <api-key> / X-API-Key.",
          code: "unauthorized",
        },
        { status: 401 }
      );
    }
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // HTML navigations: cookie check only (session validated server-side in layouts).
  if (!isApiPath(pathname) && isDocumentNavigation(request)) {
    const hasSessionCookie =
      request.cookies.has("next-auth.session-token") ||
      request.cookies.has("__Secure-next-auth.session-token");
    if (hasSessionCookie) {
      return NextResponse.next();
    }
  }

  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret });
  if (token) {
    return NextResponse.next();
  }

  if (isApiPath(pathname) && !isPublicApiPath(pathname)) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const callbackUrl =
    host != null && host !== ""
      ? `${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`
      : request.url;
  const signInUrl = new URL("/auth/signin", request.url);
  signInUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
