import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/session";
import { buildGscAuthUrl, isGscOAuthConfigured } from "@/lib/gsc-client";

const STATE_COOKIE = "gsc_oauth_state";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGscOAuthConfigured()) {
    return NextResponse.json(
      {
        error: "GSC OAuth not configured",
        hint: "Set GSC_ENABLED=true, GOOGLE_GSC_CLIENT_ID, GOOGLE_GSC_CLIENT_SECRET",
      },
      { status: 503 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = buildGscAuthUrl(state);
  return NextResponse.redirect(url);
}
