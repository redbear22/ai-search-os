"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { TierKey } from "@/lib/feature-flags";

type TierResponse = {
  tier: TierKey;
  domainLimit?: number;
};

export function useUserTier() {
  const { status } = useSession();
  const [tier, setTier] = useState<TierKey>("free");
  const [domainLimit, setDomainLimit] = useState(0);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (status === "loading") return;

    if (!isAuthenticated) {
      setTier("free");
      setDomainLimit(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/user/tier");
        if (!res.ok) throw new Error("tier fetch failed");
        const data = (await res.json()) as TierResponse;
        if (!cancelled) {
          setTier(data.tier ?? "free");
          setDomainLimit(data.domainLimit ?? 0);
        }
      } catch {
        if (!cancelled) {
          setTier("free");
          setDomainLimit(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, isAuthenticated]);

  return { tier, domainLimit, loading, isAuthenticated };
}
