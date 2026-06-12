"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";

type DomainRecord = { id: string; url: string; isActive?: boolean };

export function useDomainCount() {
  const { isAuthenticated, isLoading: userLoading, domainLimit } = useUser();
  const [domainCount, setDomainCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;

    if (!isAuthenticated) {
      setDomainCount(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/domains");
        if (!res.ok) throw new Error("domains fetch failed");
        const domains = (await res.json()) as DomainRecord[];
        if (!cancelled) {
          setDomainCount(
            Array.isArray(domains)
              ? domains.filter((d) => d.isActive !== false).length
              : 0
          );
        }
      } catch {
        if (!cancelled) setDomainCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userLoading]);

  return {
    domainCount,
    domainLimit,
    loading: userLoading || loading,
  };
}
