import type { AgencyRole, UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      agencyId: string | null;
      clientId: string | null;
      agencyRole: AgencyRole;
      activeClientId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    agencyId?: string | null;
    clientId?: string | null;
    agencyRole?: AgencyRole;
    activeClientId?: string | null;
  }
}

export {};
