import "server-only";

import type { ClarityProvider } from "@/lib/server/ai-prompts/templates";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY?.trim();
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY?.trim();
const GEMINI_MODEL = process.env.GOOGLE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";

export type AiCompletionOptions = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
};

export async function completeWithProvider(
  provider: ClarityProvider,
  options: AiCompletionOptions
): Promise<string> {
  switch (provider) {
    case "openai":
      return completeOpenAi(options);
    case "claude":
      return completeAnthropic(options);
    case "gemini":
      return completeGemini(options);
    case "perplexity":
      return completePerplexity(options);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function completeOpenAi(options: AiCompletionOptions): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 500,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function completeAnthropic(options: AiCompletionOptions): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const baseUrl =
    process.env.ANTHROPIC_API_URL?.replace(/\/$/, "") || "https://api.anthropic.com/v1";

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: options.model ?? "claude-haiku-4-5",
      max_tokens: options.maxTokens ?? 500,
      system: options.system,
      messages: [{ role: "user", content: options.user }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${await response.text()}`);
  }

  const data = await response.json();
  const textBlock = Array.isArray(data.content)
    ? data.content.find((b: { type?: string }) => b.type === "text")
    : null;
  return textBlock?.text?.trim() || "";
}

async function completeGemini(options: AiCompletionOptions): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `${options.system}\n\n${options.user}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 500,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${await response.text()}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function completePerplexity(options: AiCompletionOptions): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const baseUrl =
    process.env.PERPLEXITY_API_URL?.replace(/\/$/, "") || "https://api.perplexity.ai";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model ?? "sonar",
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export function mapPlatformToProvider(platform: string): ClarityProvider {
  if (platform === "chatgpt") return "openai";
  if (platform === "claude" || platform === "gemini" || platform === "perplexity") {
    return platform;
  }
  if (platform === "openai") return "openai";
  throw new Error(`Unknown platform: ${platform}`);
}
