export type ComparisonModel = "chatgpt" | "perplexity" | "claude" | "gemini";

export interface ModelResponse {
  model: ComparisonModel;
  response: string;
  brandMentioned: boolean;
  sentiment: "positive" | "neutral" | "negative";
  citations: string[];
  confidence: number;
  responseTime: number;
  error?: string;
}

export interface ComparisonResult {
  id: string;
  query: string;
  brandName: string;
  competitors: string[];
  responses: ModelResponse[];
  summary: {
    brandMentionCount: number;
    totalResponses: number;
    averageSentiment: number;
    topCitations: string[];
    consensusPoints: string[];
    missingInModels: ComparisonModel[];
  };
  timestamp: string;
}

interface ClarityApiResponse {
  response?: string;
  error?: string;
}

const MODELS: ComparisonModel[] = ["chatgpt", "perplexity", "claude", "gemini"];

function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function modelEndpoint(model: ComparisonModel): {
  endpoint: string;
  body: Record<string, string>;
} {
  switch (model) {
    case "perplexity":
      return { endpoint: "/api/clarity/perplexity", body: {} };
    case "chatgpt":
      return { endpoint: "/api/clarity/openai", body: { model: "gpt-4o-mini" } };
    case "claude":
      return { endpoint: "/api/clarity/claude", body: {} };
    case "gemini":
      return { endpoint: "/api/clarity/gemini", body: {} };
  }
}

export async function runMultiModelComparison(
  query: string,
  brandName: string,
  competitors: string[] = []
): Promise<ComparisonResult> {
  const promises = MODELS.map(async (model): Promise<ModelResponse> => {
    const startTime = Date.now();
    const { endpoint, body: extraBody } = modelEndpoint(model);

    try {
      const response = await fetch(`${getAppBaseUrl()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          brandName,
          task: "citation_search",
          ...extraBody,
        }),
      });

      const data = (await response.json()) as ClarityApiResponse;
      const responseTime = Date.now() - startTime;

      if (!response.ok || !data.response) {
        throw new Error(data.error || "No response");
      }

      const fullResponse = data.response;
      const brandMentioned = fullResponse
        .toLowerCase()
        .includes(brandName.toLowerCase());
      const citations = extractCitations(fullResponse);
      const sentiment = analyzeSentiment(fullResponse, brandName);

      return {
        model,
        response: fullResponse,
        brandMentioned,
        sentiment,
        citations,
        confidence: brandMentioned ? 0.8 : 0.5,
        responseTime,
      };
    } catch (error) {
      return {
        model,
        response: "",
        brandMentioned: false,
        sentiment: "neutral",
        citations: [],
        confidence: 0,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const responses = await Promise.all(promises);
  const successful = responses.filter((r) => !r.error);

  const brandMentionCount = responses.filter((r) => r.brandMentioned).length;
  const totalResponses = successful.length;
  const averageSentiment =
    successful.reduce((sum, r) => {
      const score =
        r.sentiment === "positive" ? 1 : r.sentiment === "neutral" ? 0.5 : 0;
      return sum + score;
    }, 0) / (totalResponses || 1);

  const allText = responses.map((r) => r.response).join(" ");
  const consensusPoints = extractConsensusPoints(allText);

  const missingInModels = responses
    .filter((r) => !r.brandMentioned && !r.error)
    .map((r) => r.model);

  const allCitations = responses.flatMap((r) => r.citations);
  const topCitations = [...new Set(allCitations)].slice(0, 5);

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    query,
    brandName,
    competitors,
    responses,
    summary: {
      brandMentionCount,
      totalResponses,
      averageSentiment,
      topCitations,
      consensusPoints,
      missingInModels,
    },
    timestamp: new Date().toISOString(),
  };
}

function extractCitations(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s)]+/g;
  return text.match(urlRegex) || [];
}

function analyzeSentiment(
  text: string,
  _brandName: string
): "positive" | "neutral" | "negative" {
  const brandText = text.toLowerCase();
  const positiveWords = [
    "excellent",
    "great",
    "best",
    "amazing",
    "recommend",
    "love",
    "perfect",
    "outstanding",
  ];
  const negativeWords = [
    "poor",
    "bad",
    "worst",
    "terrible",
    "avoid",
    "issue",
    "problem",
    "missing",
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of positiveWords) {
    if (brandText.includes(word)) positiveScore++;
  }
  for (const word of negativeWords) {
    if (brandText.includes(word)) negativeScore++;
  }

  if (positiveScore > negativeScore) return "positive";
  if (negativeScore > positiveScore) return "negative";
  return "neutral";
}

function extractConsensusPoints(text: string): string[] {
  const commonPhrases: string[] = [];
  const pattern =
    /(\w+(?:\s+\w+){1,5})\s+(?:is|are|has|offers|provides)\s+(\w+(?:\s+\w+){1,10})/gi;

  let match: RegExpExecArray | null;
  while (
    (match = pattern.exec(text)) !== null &&
    commonPhrases.length < 5
  ) {
    commonPhrases.push(`${match[1]} ${match[2]}`);
  }

  return [...new Set(commonPhrases)];
}
