import { useState } from "react";

import { toastApiError } from "@/lib/api-error";

import type { AIPlatform } from "@/lib/audit-types";

import type { AuditClarityForm } from "@/hooks/useAuditClarityForm";

import { useAuditStore } from "@/store/auditStore";



interface ClarityAIResponse {

  response: string;

  loading: boolean;

  error: string | null;

}



export interface PlatformQueryResult {

  platform: AIPlatform;

  response: string | null;

}



type QueryAIOptions = {

  persist?: boolean;

  task?: "brand_overview" | "brand_short";

};



function persistSingleResponse(

  form: AuditClarityForm | undefined,

  platform: AIPlatform,

  response: string,

  setPlatformClarity: ReturnType<typeof useAuditStore.getState>["setPlatformClarity"]

) {

  if (form) {

    const current = form.getValues("clarity.responses");

    form.setValue(

      "clarity.responses",

      current.map((row) =>

        row.platform === platform ? { ...row, responseText: response } : row

      )

    );

  } else {

    setPlatformClarity(platform, { responseText: response });

  }

}



function persistAllResponses(

  form: AuditClarityForm | undefined,

  results: PlatformQueryResult[],

  setPlatformResponses: ReturnType<typeof useAuditStore.getState>["setPlatformResponses"]

) {

  if (form) {

    const current = form.getValues("clarity.responses");

    const updated = current.map((existing) => {

      const hit = results.find((r) => r.platform === existing.platform);

      return hit?.response

        ? { ...existing, responseText: hit.response }

        : existing;

    });

    form.setValue("clarity.responses", updated);

    return;

  }



  const updates: Partial<Record<AIPlatform, string>> = {};

  for (const { platform, response } of results) {

    if (response) updates[platform] = response;

  }

  if (Object.keys(updates).length > 0) {

    setPlatformResponses(updates);

  }

}



function clarityEndpoint(platform: string): string {

  if (platform === "perplexity") return "/api/clarity/perplexity";

  if (platform === "claude") return "/api/clarity/claude";

  if (platform === "gemini") return "/api/clarity/gemini";

  return "/api/clarity/openai";

}



export function useClarityAI(form?: AuditClarityForm) {

  const [state, setState] = useState<Record<string, ClarityAIResponse>>({});

  const setPlatformClarity = useAuditStore((s) => s.setPlatformClarity);

  const setPlatformResponses = useAuditStore((s) => s.setPlatformResponses);



  const queryAI = async (

    platform: string,

    brandName: string,

    options: QueryAIOptions = {}

  ) => {

    const { persist = true, task = "brand_overview" } = options;

    const endpoint = clarityEndpoint(platform);



    setState((prev) => ({

      ...prev,

      [platform]: { response: "", loading: true, error: null },

    }));



    try {

      const body =

        platform === "chatgpt"

          ? { brandName, task, model: "gpt-4o-mini" }

          : { brandName, task };



      const res = await fetch(endpoint, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(body),

      });

      const data = await res.json();

      if (!res.ok) {

        throw new Error(data.error || "Failed to query AI");

      }



      const response = data.response as string;

      setState((prev) => ({

        ...prev,

        [platform]: { response, loading: false, error: null },

      }));



      if (persist) {

        persistSingleResponse(

          form,

          platform as AIPlatform,

          response,

          setPlatformClarity

        );

      }



      return response;

    } catch (error) {

      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setState((prev) => ({

        ...prev,

        [platform]: { response: "", loading: false, error: errorMsg },

      }));

      toastApiError();

      return null;

    }

  };



  const queryAllPlatforms = async (brandName: string): Promise<PlatformQueryResult[]> => {

    const platforms: AIPlatform[] = ["chatgpt", "perplexity", "claude", "gemini"];

    const results: PlatformQueryResult[] = [];



    for (const id of platforms) {

      setState((prev) => ({

        ...prev,

        [id]: { response: "", loading: true, error: null },

      }));



      try {

        const url = clarityEndpoint(id);

        const body =

          id === "chatgpt"

            ? { brandName, task: "brand_overview", model: "gpt-4o-mini" }

            : { brandName, task: "brand_overview" };



        const res = await fetch(url, {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify(body),

        });

        const data = await res.json();



        if (data.response) {

          setState((prev) => ({

            ...prev,

            [id]: { response: data.response, loading: false, error: null },

          }));



          results.push({ platform: id, response: data.response });



          if (process.env.NODE_ENV === "development") {

            const w = window as Window & {

              claritySetResponse?: (platform: AIPlatform, text: string) => void;

            };

            w.claritySetResponse?.(id, data.response);

          }

        } else {

          throw new Error(data.error || "No response");

        }

      } catch (error) {

        const errorMsg = error instanceof Error ? error.message : "Unknown error";

        setState((prev) => ({

          ...prev,

          [id]: { response: "", loading: false, error: errorMsg },

        }));

        toastApiError();

        results.push({ platform: id, response: null });

      }

    }



    persistAllResponses(form, results, setPlatformResponses);



    return results;

  };



  const getResponse = (platform: string) => {

    const live = state[platform]?.response;

    if (live) return live;

    return useAuditStore.getState().clarity.platforms[platform as AIPlatform]?.responseText || "";

  };



  const getLoading = (platform: string) => state[platform]?.loading || false;

  const getError = (platform: string) => state[platform]?.error || null;



  return { queryAI, queryAllPlatforms, getResponse, getLoading, getError };

}


