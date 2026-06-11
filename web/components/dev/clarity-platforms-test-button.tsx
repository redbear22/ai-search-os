"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastApiError } from "@/lib/api-error";

const CLARITY_API_PLATFORMS = ["openai", "perplexity", "claude", "gemini"] as const;

/** Temporary dev helper — hits all four /api/clarity/* routes and logs responses. */
export function ClarityPlatformsTestButton() {
  const [loading, setLoading] = useState(false);

  const testAllPlatforms = async () => {
    setLoading(true);
    try {
      for (const platform of CLARITY_API_PLATFORMS) {
        const res = await fetch(`/api/clarity/${platform}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandName: "PickAdviser",
            task: "brand_short",
            ...(platform === "openai" ? { model: "gpt-4o-mini" } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toastApiError();
          continue;
        }
        console.log(`${platform}:`, data.response?.substring(0, 100));
      }
    } catch {
      toastApiError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={testAllPlatforms} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Test clarity APIs (dev)
    </Button>
  );
}
