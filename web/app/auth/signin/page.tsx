import { headers } from "next/headers";

import Link from "next/link";

import { AlertCircle, Lock } from "lucide-react";

import { SignInButtons } from "@/components/auth/sign-in-buttons";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { isAuthConfigured } from "@/lib/auth";

import { getDevAuthEmail, isDevAuthBypassEnabled } from "@/lib/dev-auth";



const ERROR_HINTS: Record<string, string> = {

  OAuthSignin:

    "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to web/.env.local, then restart the dev server.",

  Configuration:

    "Add NEXTAUTH_SECRET, NEXTAUTH_URL, and Google OAuth keys to web/.env.local, then restart npm run dev.",

  google:

    "Sign-in was started incorrectly (do not open /api/auth/signin/google directly). Click Continue with Google on this page.",

  OAuthCallback:

    "OAuth state cookie was lost during the Google redirect. Clear cookies for this site, stay on the same host for the whole flow, and finish Google sign-in in the same browser window.",

  AccessDenied:

    "Your email is not approved yet. Ask an admin to seed your email as APPROVED or ADMIN, or approve you at /admin/users.",

  OAuthAccountNotLinked:

    "Your email exists in the database but wasn't linked to Google yet. Try again in an incognito window — the app will link your Google account on the next sign-in.",

  Callback:

    "Google returned successfully but session creation failed. Restart npm run dev, clear site cookies, and try again. If it persists, check the terminal for OAUTH_CALLBACK_HANDLER_ERROR.",

  CredentialsSignin:

    "Dev sign-in failed. Set DEV_AUTH_EMAIL to an APPROVED or ADMIN user in web/.env.local and restart npm run dev.",

};



const OAUTH_SIGN_IN_URLS = [

  { label: "127.0.0.1:3000", href: "http://127.0.0.1:3000/auth/signin" },

  { label: "localhost:3000", href: "http://localhost:3000/auth/signin" },

] as const;



export default async function SignInPage({

  searchParams,

}: {

  searchParams: Promise<{ error?: string }>;

}) {

  const params = await searchParams;

  const googleAuthReady = isAuthConfigured();

  const devBypassReady = isDevAuthBypassEnabled();

  const errorHint = params.error ? ERROR_HINTS[params.error] : null;

  const headerList = await headers();

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";

  const isOAuthHost =

    host.startsWith("localhost:") ||

    host.startsWith("127.0.0.1:") ||

    host === "localhost" ||

    host === "127.0.0.1";

  const devAuthEmail = getDevAuthEmail();



  return (

    <div className="flex min-h-screen items-center justify-center bg-background p-6">

      <Card className="w-full max-w-md border-primary/20">

        <CardHeader className="text-center">

          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">

            <Lock className="h-6 w-6 text-primary" />

          </div>

          <CardTitle>Sign in to AI Search OS</CardTitle>

          <CardDescription>

            {isOAuthHost

              ? "Sign in with Google on this same host — do not switch to a LAN IP mid-flow."

              : "Google OAuth cannot run on private LAN IPs. Use dev sign-in below or open an OAuth URL."}

          </CardDescription>

        </CardHeader>

        <CardContent className="space-y-4">

          {!googleAuthReady && !devBypassReady && (

            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">

              <p className="font-medium">Sign-in not configured yet</p>

              <p className="mt-1 text-xs text-yellow-100/90">

                Add Google OAuth keys to <code className="rounded bg-black/20 px-1">web/.env.local</code>,

                or for LAN-only dev set <code>DEV_AUTH_BYPASS=true</code> and{" "}

                <code>DEV_AUTH_EMAIL=you@example.com</code> (user must be APPROVED in the DB).

              </p>

            </div>

          )}



          {errorHint && (

            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">

              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <p>{errorHint}</p>

            </div>

          )}



          {!isOAuthHost && (

            <div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-100">

              <p className="font-medium">Browsing on {host || "LAN IP"} is fine</p>

              <p className="mt-1 text-xs text-blue-100/90">

                Google blocks OAuth redirect URIs on private addresses like{" "}

                <code className="rounded bg-black/20 px-1">192.168.x.x</code>. Sessions are

                per-host — sign in here on the same URL you use to browse.

              </p>

            </div>

          )}



          {!isOAuthHost && devBypassReady && (

            <SignInButtons

              provider="dev-bypass"

              label={`Dev sign-in${devAuthEmail ? ` (${devAuthEmail})` : ""}`}

              disabled={false}

            />

          )}



          {!isOAuthHost && googleAuthReady && (

            <div className="space-y-2">

              <p className="text-xs text-muted-foreground">

                For Google sign-in, try these in Chrome (same tab through the whole flow):

              </p>

              {OAUTH_SIGN_IN_URLS.map(({ label, href }) => (

                <Button key={href} asChild className="w-full" variant="secondary">

                  <Link href={href}>Continue on {label}</Link>

                </Button>

              ))}

            </div>

          )}



          {isOAuthHost && googleAuthReady && (

            <SignInButtons disabled={!googleAuthReady} />

          )}



          {isOAuthHost && devBypassReady && (

            <SignInButtons

              provider="dev-bypass"

              label={`Dev sign-in${devAuthEmail ? ` (${devAuthEmail})` : ""}`}

              disabled={false}

            />

          )}



          <p className="text-center text-xs text-muted-foreground">

            {isOAuthHost

              ? "Google redirect URI must match this host in Google Cloud Console."

              : devBypassReady

                ? "Dev bypass is enabled for local development only."

                : "Enable DEV_AUTH_BYPASS in .env.local if Chrome cannot open localhost."}

          </p>

        </CardContent>

      </Card>

    </div>

  );

}


