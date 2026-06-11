import { isDatabaseConfigured } from "@/lib/prisma";

/** Local dev only — sign in without Google when the browser cannot use localhost OAuth. */
export function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_BYPASS?.trim().toLowerCase() === "true" &&
    Boolean(process.env.NEXTAUTH_SECRET?.trim()) &&
    Boolean(process.env.DEV_AUTH_EMAIL?.trim()) &&
    isDatabaseConfigured()
  );
}

export function getDevAuthEmail(): string | null {
  const email = process.env.DEV_AUTH_EMAIL?.trim().toLowerCase();
  return email || null;
}
