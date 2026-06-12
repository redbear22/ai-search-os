import "@/lib/dev-tls";
import type { NextAuthOptions } from "next-auth";
import type { Account as OAuthAccount } from "next-auth";
import type { AgencyRole, UserRole } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getBasePrisma, getPrisma, isDatabaseConfigured } from "@/lib/prisma";
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

async function syncOAuthAccount(
  userId: string,
  account: OAuthAccount | null | undefined,
  profile: { name?: string | null; image?: string | null }
) {
  if (!account) return;

  const prisma = getBasePrisma();
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    create: {
      userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      refresh_token: account.refresh_token,
      access_token: account.access_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
      session_state: account.session_state,
    },
    update: {
      refresh_token: account.refresh_token,
      access_token: account.access_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
      session_state: account.session_state,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: profile.name ?? undefined,
      image: profile.image ?? undefined,
      emailVerified: new Date(),
    },
  });
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  // JWT sessions — no PrismaAdapter (avoids pooler failures during OAuth callback on Vercel)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      if (!isDatabaseConfigured()) return false;
      if (!user.email) return false;

      try {
        const email = user.email.trim().toLowerCase();
        const dbUser = await getBasePrisma().user.findUnique({ where: { email } });

        if (!dbUser) {
          console.error("[auth] signIn rejected: no pre-approved user for", email);
          return false;
        }

        return dbUser.role === "APPROVED" || dbUser.role === "ADMIN";
      } catch (err) {
        console.error("[auth] signIn callback failed", err);
        return false;
      }
    },
    async jwt({ token, user, trigger, session }) {
      if (user?.email) {
        try {
          const email = user.email.trim().toLowerCase();
          const dbUser = await getBasePrisma().user.findUnique({ where: { email } });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } catch (err) {
          console.error("[auth] jwt callback user lookup failed", err);
        }
      }

      const userId = (token.id as string | undefined) ?? undefined;

      if (trigger === "update" && session?.activeClientId) {
        token.activeClientId = session.activeClientId as string;
      }

      if (userId) {
        try {
          const workspace = await loadWorkspaceUserFields(
            userId,
            token.activeClientId as string | null | undefined
          );
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
  debug: process.env.NEXTAUTH_DEBUG === "true",
  events: {
    async signIn(message) {
      console.info("[auth] signIn event", message.user.email ?? message.user.id);
      const email = message.user.email?.trim().toLowerCase();
      if (!email) return;

      try {
        const dbUser = await getBasePrisma().user.findUnique({ where: { email } });
        if (!dbUser) return;

        await syncOAuthAccount(dbUser.id, message.account, {
          name: message.user.name,
          image: message.user.image,
        });
      } catch (err) {
        // Non-fatal: JWT session is already issued; account row sync can retry next sign-in.
        console.error("[auth] syncOAuthAccount failed", err);
      }
    },
  },
};
