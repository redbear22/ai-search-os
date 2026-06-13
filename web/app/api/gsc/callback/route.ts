import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/token-encryption";
import {
  exchangeGscCode,
  fetchGscProperties,
  isGscOAuthConfigured,
} from "@/lib/gsc-client";

const STATE_COOKIE = "gsc_oauth_state";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const dashboardUrl = new URL("/dashboard/gsc", request.url);

  if (error) {
    dashboardUrl.searchParams.set("gsc_error", error);
    return NextResponse.redirect(dashboardUrl);
  }

  if (!code || !state) {
    dashboardUrl.searchParams.set("gsc_error", "missing_code");
    return NextResponse.redirect(dashboardUrl);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!savedState || savedState !== state) {
    dashboardUrl.searchParams.set("gsc_error", "invalid_state");
    return NextResponse.redirect(dashboardUrl);
  }

  if (!isGscOAuthConfigured()) {
    dashboardUrl.searchParams.set("gsc_error", "not_configured");
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    const tokens = await exchangeGscCode(code);
    let properties = null;
    try {
      properties = await fetchGscProperties(tokens.accessToken);
    } catch {
      properties = [];
    }

    await prisma.gscConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: encryptToken(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        properties: properties ?? [],
      },
      update: {
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: encryptToken(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        properties: properties ?? [],
      },
    });

    dashboardUrl.searchParams.set("gsc_connected", "1");
    return NextResponse.redirect(dashboardUrl);
  } catch (err) {
    dashboardUrl.searchParams.set(
      "gsc_error",
      err instanceof Error ? err.message : "exchange_failed"
    );
    return NextResponse.redirect(dashboardUrl);
  }
}
