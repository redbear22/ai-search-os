import { AlertCircle, Lock } from "lucide-react";
import { SignInButtons } from "@/components/auth/sign-in-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthConfigured } from "@/lib/auth";
import { getDevAuthEmail, isDevAuthBypassEnabled } from "@/lib/dev-auth";

const ERROR_HINTS: Record<string, string> = {
  OAuthSignin:
    "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to web/.env.local, then restart the dev server.",
  Configuration:
    "Add NEXTAUTH_SECRET, NEXTAUTH_URL, and Google OAuth keys to web/.env.local, then restart npm run dev.",
  google:
    "Sign-in was started incorrectly. Click Continue with Google on this page.",
  OAuthCallback:
    "OAuth state cookie was lost during the Google redirect. Clear cookies for this site and try again in the same browser window.",
  AccessDenied:
    "Your email is not approved yet. Ask an admin to approve your account.",
  OAuthAccountNotLinked:
    "Your email exists in the database but wasn't linked to Google yet. Try again in an incognito window.",
  Callback:
    "Google sign-in succeeded but the app could not save your session. Check that DATABASE_URL points to Supabase PostgreSQL, prisma db push has been run, and your email exists as APPROVED or ADMIN in the User table.",
  CredentialsSignin: "Dev sign-in failed. Check DEV_AUTH_EMAIL in web/.env.local.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const googleAuthReady = isAuthConfigured();
  const devBypassReady = isDevAuthBypassEnabled();
  const errorHint = params.error ? ERROR_HINTS[params.error] : null;
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
            Sign in with your Google account to access your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!googleAuthReady && !devBypassReady && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              <p className="font-medium">Sign-in not configured yet</p>
              <p className="mt-1 text-xs text-yellow-100/90">
                Add Google OAuth keys to{" "}
                <code className="rounded bg-black/20 px-1">web/.env.local</code> and restart the
                dev server.
              </p>
            </div>
          )}

          {errorHint && (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorHint}</p>
            </div>
          )}

          {googleAuthReady && <SignInButtons disabled={!googleAuthReady} />}

          {devBypassReady && (
            <SignInButtons
              provider="dev-bypass"
              label={`Dev sign-in${devAuthEmail ? ` (${devAuthEmail})` : ""}`}
              disabled={false}
            />
          )}

          <p className="text-center text-xs text-muted-foreground">
            Access is limited to approved accounts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
