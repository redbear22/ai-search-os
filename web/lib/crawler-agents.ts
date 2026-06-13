export const AI_CRAWLERS = {
  GPTBot: {
    name: "ChatGPT",
    patterns: ["GPTBot", "ChatGPT-User", "OAI-SearchBot"],
    color: "#06B6D4",
    docs: "https://platform.openai.com/docs/gptbot",
  },
  ClaudeBot: {
    name: "Claude",
    patterns: ["ClaudeBot", "Claude-Web", "anthropic-ai"],
    color: "#FB923C",
    docs: "https://www.anthropic.com/claude-bot",
  },
  PerplexityBot: {
    name: "Perplexity",
    patterns: ["PerplexityBot", "Perplexity-User"],
    color: "#A855F7",
    docs: "https://docs.perplexity.ai",
  },
  GoogleBot: {
    name: "Google AI",
    patterns: ["Googlebot", "GoogleOther", "Google-Extended"],
    color: "#60A5FA",
    docs: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers",
  },
  BingBot: {
    name: "Copilot",
    patterns: ["bingbot", "BingPreview"],
    color: "#34D399",
    docs: "https://www.bing.com/webmaster/help/which-crawlers-does-bing-use",
  },
} as const;

export type CrawlerKey = keyof typeof AI_CRAWLERS;

export function detectCrawler(userAgent: string): CrawlerKey | null {
  const ua = userAgent.toLowerCase();
  for (const [key, info] of Object.entries(AI_CRAWLERS)) {
    if (info.patterns.some((p) => ua.includes(p.toLowerCase()))) {
      return key as CrawlerKey;
    }
  }
  return null;
}

/** Robots.txt user-agent tokens to check for blocking */
export const ROBOTS_BOT_TOKENS: Record<CrawlerKey, string[]> = {
  GPTBot: ["GPTBot", "ChatGPT-User", "OAI-SearchBot"],
  ClaudeBot: ["ClaudeBot", "Claude-Web", "anthropic-ai"],
  PerplexityBot: ["PerplexityBot"],
  GoogleBot: ["Googlebot", "Google-Extended", "GoogleOther"],
  BingBot: ["bingbot"],
};
