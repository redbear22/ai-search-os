import "@/lib/dev-tls";
import type { NextAuthOptions } from "next-auth";
import type { AgencyRole, User as DbUser, UserRole } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getDevAuthEmail, isDevAuthBypassEnabled } from "@/lib/dev-auth";
import { loadWorkspaceUserFields } from "@/lib/workspace";

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXTAUTH_SECRET?.trim() &&
      isDatabaseConfigured() &&
      process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

function buildProviders() {
  const providers: NextAuthOptions["providers"] = [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
      // Local dev: skip state/PKCE cookies — App Router + fetch often drops them on callback.
      checks: process.env.NODE_ENV === "development" ? ["none"] : ["pkce", "state"],
    }),
  ];

  if (isDevAuthBypassEnabled()) {
    providers.push(
      CredentialsProvider({
        id: "dev-bypass",
        name: "Development bypass",
        credentials: {},
        async authorize() {
          if (!isDevAuthBypassEnabled()) return null;

          const email = getDevAuthEmail();
          if (!email) return null;

          const user = await getPrisma().user.findUnique({ where: { email } });
          if (!user || (user.role !== "APPROVED" && user.role !== "ADMIN")) {
            return null;
          }

          return user;
        },
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(getPrisma() as never),
  providers: buildProviders(),
  // JWT sessions so middleware getToken() works (database sessions use opaque cookies)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      if (!isDatabaseConfigured()) return false;
      if (!user.email) return false;

      const email = user.email.trim().toLowerCase();
      const dbUser = await getPrisma().user.findUnique({ where: { email } });

      if (!dbUser) return false;

      return dbUser.role === "APPROVED" || dbUser.role === "ADMIN";
    },
    async jwt({ token, user, trigger, session }) {
      const userId = (user as DbUser | undefined)?.id ?? (token.id as string | undefined);

      if (user) {
        const dbUser = user as DbUser;
        token.id = dbUser.id;
        token.role = dbUser.role;
      }

      if (trigger === "update" && session?.activeClientId) {
        token.activeClientId = session.activeClientId as string;
      }

      if (userId) {
        try {
          const workspace = await loadWorkspaceUserFields(userId);
          if (workspace) {
            token.role = workspace.role;
            token.agencyId = workspace.agencyId;
            token.clientId = workspace.clientId;
            token.agencyRole = workspace.agencyRole;
            if (!token.activeClientId && workspace.activeClientId) {
              token.activeClientId = workspace.activeClientId;
            }
          }
        } catch (err) {
          console.error("[auth] loadWorkspaceUserFields failed during jwt callback", err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.agencyId = (token.agencyId as string | null | undefined) ?? null;
        session.user.clientId = (token.clientId as string | null | undefined) ?? null;
        session.user.agencyRole =
          (token.agencyRole as AgencyRole | undefined) ?? "AGENCY_TEAM";
        session.user.activeClientId =
          (token.activeClientId as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
