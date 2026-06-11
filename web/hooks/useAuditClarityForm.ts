import { useMemo } from "react";
import type { AIPlatform } from "@/lib/audit-types";
import { CLARITY_PLATFORMS } from "@/lib/clarity-comparison";
import { useAuditStore } from "@/store/auditStore";

export interface ClarityFormResponse {
  platform: AIPlatform;
  responseText: string;
}

/** react-hook-form–compatible adapter backed by Zustand audit store. */
export interface AuditClarityForm {
  getValues: (path: "clarity.responses") => ClarityFormResponse[];
  setValue: (path: "clarity.responses", value: ClarityFormResponse[]) => void;
}

export function useAuditClarityForm(): AuditClarityForm {
  const clarity = useAuditStore((s) => s.clarity);
  const setPlatformResponses = useAuditStore((s) => s.setPlatformResponses);

  return useMemo(
    () => ({
      getValues: (path: "clarity.responses") => {
        if (path !== "clarity.responses") return [];
        return CLARITY_PLATFORMS.map((platform) => ({
          platform,
          responseText: clarity.platforms[platform]?.responseText ?? "",
        }));
      },
      setValue: (path: "clarity.responses", value: ClarityFormResponse[]) => {
        if (path !== "clarity.responses") return;
        const updates: Partial<Record<AIPlatform, string>> = {};
        for (const row of value) {
          if (row.responseText?.trim()) {
            updates[row.platform] = row.responseText;
          }
        }
        if (Object.keys(updates).length > 0) {
          setPlatformResponses(updates);
        }
      },
    }),
    [clarity, setPlatformResponses]
  );
}
