import { AlertCircle, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Email not pre-approved",
    description:
      "Your Google account is not on the approved access list. Ask an admin to add your email to the database with APPROVED or ADMIN role before signing in.",
  },
  OAuthSignin: {
    title: "Sign-in could not start",
    description: "Check that Google OAuth credentials are configured correctly.",
  },
  OAuthCallback: {
    title: "Sign-in failed",
    description: "Something went wrong during the OAuth callback. Please try again.",
  },
  OAuthAccountNotLinked: {
    title: "Account not linked",
    description: "This email is already linked to another sign-in method.",
  },
  Configuration: {
    title: "Configuration error",
    description: "Authentication is misconfigured. Check server environment variables.",
  },
  Default: {
    title: "Sign-in failed",
    description: "Something went wrong. Please try again or contact your admin.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = ERROR_MESSAGES[params.error ?? ""] ?? ERROR_MESSAGES.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-destructive/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>{error.title}</CardTitle>
          <CardDescription>{error.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error.description}</p>
          </div>
          <Button asChild className="w-full">
            <Link href="/auth/signin">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
