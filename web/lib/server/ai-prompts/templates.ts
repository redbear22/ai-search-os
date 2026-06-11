import "server-only";

export type AiTask =
  | "clarity_brand_overview"
  | "clarity_brand_short"
  | "citation_search"
  | "fix_generation"
  | "outreach_pitch"
  | "content_outline"
  | "executive_summary";

export type ClarityProvider = "openai" | "claude" | "gemini" | "perplexity";

export type FixGenerationParams = {
  gap: string;
  layer?: string;
  severity?: string;
  title?: string;
  source?: string;
  suggestedOwner?: string;
  suggestedTimeline?: number;
  brandName?: string;
  domain?: string;
};

export type ClarityQueryParams = {
  brandName: string;
  query?: string;
  competitors?: string[];
};

export type OutreachPitchParams = {
  gapTitle: string;
  gapDescription: string;
  publication: string;
  brandName: string;
};

export type ContentOutlineParams = {
  gapTitle: string;
  brandName: string;
};

export type ExecutiveSummaryParams = {
  clientName: string;
  template: string;
};

export function getSystemPrompt(task: AiTask, provider?: ClarityProvider): string {
  switch (task) {
    case "clarity_brand_overview":
    case "clarity_brand_short":
      return provider === "perplexity"
        ? "You are an AI search auditor. Provide accurate, concise responses about brands with citations when possible."
        : "You are an AI search auditor. Provide accurate, concise responses about brands based on your knowledge.";
    case "citation_search":
      return "You are a citation research assistant. Return structured, factual results.";
    case "fix_generation":
      return "You are an AI search optimization strategist. Respond with JSON only, no markdown.";
    case "outreach_pitch":
    case "content_outline":
      return "You are an SEO and PR specialist. Be concise and actionable.";
    case "executive_summary":
      return "You write concise executive ROI summaries for agency clients. Keep under 120 words. Use plain business language.";
    default:
      return "You are a helpful assistant.";
  }
}

export function buildUserPrompt(task: AiTask, params: Record<string, unknown>): string {
  switch (task) {
    case "clarity_brand_overview": {
      const brandName = String(params.brandName ?? "");
      return `Tell me about ${brandName}. What does ${brandName} stand for or do? Be specific and factual.`;
    }
    case "clarity_brand_short": {
      const brandName = String(params.brandName ?? "");
      return `Tell me about ${brandName}`;
    }
    case "citation_search": {
      const query = String(params.query ?? "");
      return `Search for: "${query}".

List ALL brands mentioned in the response. Include both the main subject and any competitors referenced.
Then list the specific sources/citations provided.
Return JSON format:
{
  "brandsCited": ["brand1", "brand2"],
  "citedSources": ["url1", "url2"],
  "fullResponse": "..."
}`;
    }
    case "fix_generation": {
      const p = params as FixGenerationParams;
      return `
You are an AI Search Optimization expert and content strategist. Given this gap, generate a detailed, actionable fix.

GAP DETAILS:
- Gap: ${p.gap}
- Layer: ${p.layer ?? "unknown"}
- Severity: ${p.severity ?? "medium"}
- Title: ${p.title ?? p.gap}
- Source: ${p.source ?? "audit"}
- Suggested Owner: ${p.suggestedOwner ?? "Content"}
- Suggested Timeline: Week ${p.suggestedTimeline ?? 4}
${p.brandName ? `- Brand: ${p.brandName}` : ""}
${p.domain ? `- Domain: ${p.domain}` : ""}

Generate a comprehensive fix that includes:
1. Concrete Action (2-3 specific steps, 100-150 words)
2. Content Draft (if applicable — pitch email, article outline, or positioning statement)
3. Success Metrics (how to measure success)
4. Resources Needed (people, tools, budget)

Return ONLY valid JSON with this exact shape:
{
  "action": "string",
  "contentDraft": "string",
  "successMetrics": ["string"],
  "resources": ["string"],
  "estimatedEffort": "string"
}
`.trim();
    }
    case "outreach_pitch": {
      const p = params as OutreachPitchParams;
      return `Write a 150-word personalized PR pitch for ${p.publication} about: ${p.gapTitle}. Brand: ${p.brandName}. Context: ${p.gapDescription}`;
    }
    case "content_outline": {
      const p = params as ContentOutlineParams;
      return `Write a short article outline (300 words) for ${p.brandName} targeting: ${p.gapTitle}`;
    }
    case "executive_summary": {
      const p = params as ExecutiveSummaryParams;
      return `Polish this ROI executive summary for ${p.clientName}:\n\n${p.template}`;
    }
    default:
      return String(params.text ?? "");
  }
}

export function clarityTaskFromInput(input: {
  task?: string;
  brandName?: string;
  query?: string;
}): AiTask {
  if (input.task === "brand_short") return "clarity_brand_short";
  if (input.task === "citation_search" || input.query) return "citation_search";
  return "clarity_brand_overview";
}
