"use client";

import { useSession } from "next-auth/react";
import type { TierKey } from "@/lib/feature-flags";
import { useUserTier } from "@/hooks/useUserTier";

export function useUser() {
  const { data: session, status } = useSession();
  const { tier, loading, isAuthenticated, domainLimit } = useUserTier();

  const isLoading = status === "loading" || loading;
  const user = session?.user ?? null;

  return {
    user,
    tier: tier as TierKey,
    isLoading,
    /** @deprecated Prefer `isLoading` */
    loading: isLoading,
    isAuthenticated,
    domainLimit,
  };
}
