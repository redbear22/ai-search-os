import type {
  AIReadinessFetchData,
  AIReadinessScore,
  CategoryScore,
  CheckItem,
  Recommendation,
} from "@/lib/ai-readiness-types";

export type {
  AIReadinessFetchData,
  AIReadinessScore,
  CategoryScore,
  CheckItem,
  Recommendation,
} from "@/lib/ai-readiness-types";

const WEIGHTS = {
  structuredData: 25,
  answerExtractability: 18,
  llmsTxt: 18,
  aiCrawlerAccess: 12,
  entityClarity: 12,
  contentQuality: 15,
} as const;

const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Googlebot"];

function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function calculateGrade(score: number): AIReadinessScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export async function fetchAIReadinessData(url: string): Promise<AIReadinessFetchData> {
  const response = await fetch(
    `${getAppBaseUrl()}/api/ai-readiness/fetch?url=${encodeURIComponent(url)}`
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? `Failed to fetch page (${response.status})`);
  }

  return data as AIReadinessFetchData;
}

export async function calculateAIReadiness(url: string): Promise<AIReadinessScore> {
  const data = await fetchAIReadinessData(url);
  return calculateAIReadinessFromData(data);
}

export function calculateAIReadinessFromData(
  data: AIReadinessFetchData
): AIReadinessScore {
  const categories = {
    structuredData: checkStructuredData(data.html),
    answerExtractability: checkAnswerExtractability(data.html, data.text),
    llmsTxt: checkLlmsTxt(data),
    aiCrawlerAccess: checkAICrawlerAccess(data.robotsTxt),
    entityClarity: checkEntityClarity(data.html, data.text),
    contentQuality: checkContentQuality(data.html, data.text, data.wordCount),
  };

  const overall = Math.min(
    100,
    Math.round(
      categories.structuredData.score +
        categories.answerExtractability.score +
        categories.llmsTxt.score +
        categories.aiCrawlerAccess.score +
        categories.entityClarity.score +
        categories.contentQuality.score
    )
  );

  return {
    overall,
    grade: calculateGrade(overall),
    categories,
    recommendations: generateRecommendations(categories),
  };
}

function checkStructuredData(html: string): CategoryScore {
  const items: CheckItem[] = [];
  let score = 0;

  const hasJsonLd = html.includes("application/ld+json");
  items.push({
    name: "JSON-LD Structured Data",
    passed: hasJsonLd,
    details: hasJsonLd ? "Found structured data" : "No JSON-LD detected",
    fixSuggestion: hasJsonLd
      ? ""
      : "Add JSON-LD schema markup for Organization, Product, or Article types",
  });
  if (hasJsonLd) score += 8;

  const hasOrganization =
    html.includes("Organization") || html.includes("LocalBusiness");
  items.push({
    name: "Organization Schema",
    passed: hasOrganization,
    details: hasOrganization
      ? "Organization schema present"
      : "Missing organization schema",
    fixSuggestion:
      "Add Organization or LocalBusiness schema with name, logo, and contact info",
  });
  if (hasOrganization) score += 5;

  const hasBreadcrumbs = html.includes("BreadcrumbList");
  items.push({
    name: "Breadcrumb Schema",
    passed: hasBreadcrumbs,
    details: hasBreadcrumbs ? "Breadcrumb schema found" : "No breadcrumb schema",
    fixSuggestion: "Add BreadcrumbList schema to help AI understand site structure",
  });
  if (hasBreadcrumbs) score += 4;

  const hasFaq = html.includes("FAQPage") || html.includes("HowTo");
  items.push({
    name: "FAQ or HowTo Schema",
    passed: hasFaq,
    details: hasFaq ? "FAQ/HowTo schema found" : "No FAQ or HowTo schema",
    fixSuggestion:
      "Add FAQPage or HowTo schema for content that answers questions",
  });
  if (hasFaq) score += 4;

  const hasProduct =
    html.includes("Product") &&
    (html.includes("price") || html.includes("availability"));
  items.push({
    name: "Product Schema",
    passed: hasProduct,
    details: hasProduct
      ? "Product schema with price/availability"
      : "No comprehensive product schema",
    fixSuggestion:
      "Add Product schema with price, availability, and review information",
  });
  if (hasProduct) score += 4;

  return { score, max: WEIGHTS.structuredData, items };
}

function checkAnswerExtractability(html: string, text: string): CategoryScore {
  const items: CheckItem[] = [];
  let score = 0;

  const hasDirectAnswer =
    text.includes(" is ") &&
    text.split(".").some((s) => s.length < 200 && s.includes(" is "));
  items.push({
    name: "Direct Answer Format",
    passed: hasDirectAnswer,
    details: hasDirectAnswer
      ? "Content answers questions directly"
      : "Content may be too verbose for AI extraction",
    fixSuggestion:
      "Start sections with clear, declarative statements that directly answer likely questions",
  });
  if (hasDirectAnswer) score += 6;

  const hasLists =
    html.includes("<ul") || html.includes("<ol") || html.includes("<li");
  items.push({
    name: "Structured Lists",
    passed: hasLists,
    details: hasLists
      ? "Lists found (good for AI extraction)"
      : "No structured lists detected",
    fixSuggestion: "Use bullet points and numbered lists for key information",
  });
  if (hasLists) score += 5;

  const hasTables = html.includes("<table");
  items.push({
    name: "Data Tables",
    passed: hasTables,
    details: hasTables ? "Tables present" : "No tables detected",
    fixSuggestion: "Use tables for comparative or structured data",
  });
  if (hasTables) score += 4;

  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const hasShortParagraphs = paragraphs.some((p) => p.length < 300);
  items.push({
    name: "Concise Paragraphs",
    passed: hasShortParagraphs,
    details: hasShortParagraphs
      ? "Good paragraph length"
      : "Paragraphs may be too long for AI extraction",
    fixSuggestion: "Keep paragraphs under 150 words for better AI readability",
  });
  if (hasShortParagraphs) score += 3;

  return { score, max: WEIGHTS.answerExtractability, items };
}

function checkLlmsTxt(data: AIReadinessFetchData): CategoryScore {
  const items: CheckItem[] = [];
  let score = 0;

  items.push({
    name: "llms.txt file",
    passed: data.llmsTxtOk,
    details: data.llmsTxtOk
      ? "Found /llms.txt"
      : "No llms.txt file detected",
    fixSuggestion:
      "Create /llms.txt with a summary of your site for AI crawlers (2-18% citation boost)",
  });
  if (data.llmsTxtOk) score += 12;

  items.push({
    name: "llms-full.txt file",
    passed: data.llmsFullTxtOk,
    details: data.llmsFullTxtOk
      ? "Found detailed llms-full.txt"
      : "No llms-full.txt",
    fixSuggestion: "Add /llms-full.txt with comprehensive documentation",
  });
  if (data.llmsFullTxtOk) score += 6;

  return { score, max: WEIGHTS.llmsTxt, items };
}

function isCrawlerBlocked(robotsTxt: string, crawler: string): boolean {
  if (!robotsTxt.trim()) return false;

  const blocks = robotsTxt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let activeAgent = "*";
  for (const line of blocks) {
    const agentMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (agentMatch) {
      activeAgent = agentMatch[1].trim();
      continue;
    }

    if (line.toLowerCase().startsWith("disallow:")) {
      const path = line.slice(9).trim();
      const applies =
        activeAgent === "*" ||
        activeAgent.toLowerCase() === crawler.toLowerCase();
      if (applies && (path === "/" || path === "/*")) {
        return true;
      }
    }
  }

  return false;
}

function checkAICrawlerAccess(robotsTxt: string): CategoryScore {
  const items: CheckItem[] = [];
  let score = 0;

  for (const crawler of AI_CRAWLERS) {
    const blocked = isCrawlerBlocked(robotsTxt, crawler);
    items.push({
      name: `${crawler} access`,
      passed: !blocked,
      details: blocked
        ? `${crawler} appears blocked in robots.txt`
        : robotsTxt
          ? `${crawler} not blocked in robots.txt`
          : "No robots.txt found (crawlers assumed allowed)",
      fixSuggestion: `Ensure ${crawler} is not blocked in robots.txt`,
    });
    if (!blocked) score += 3;
  }

  return { score, max: WEIGHTS.aiCrawlerAccess, items };
}

function checkEntityClarity(html: string, text: string): CategoryScore {
  const items: CheckItem[] = [];
  let score = 0;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match
    ? h1Match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    : "";
  const brandConsistent =
    Boolean(title && h1) &&
    (title.toLowerCase().includes(h1.toLowerCase()) ||
      h1.toLowerCase().includes(title.toLowerCase()));

  items.push({
    name: "Brand Name Consistency",
    passed: brandConsistent,
    details: brandConsistent
      ? "Title and H1 align"
      : "Title and H1 may conflict",
    fixSuggestion:
      "Ensure your brand name appears consistently in title, H1, and throughout content",
  });
  if (brandConsistent) score += 4;

  const hasKnowledgeGraph =
    html.includes("sameAs") || html.includes("knowsAbout");
  items.push({
    name: "Knowledge Graph Signals",
    passed: hasKnowledgeGraph,
    details: hasKnowledgeGraph
      ? "Knowledge Graph signals detected"
      : "No Knowledge Graph connections",
    fixSuggestion: "Add sameAs properties to link social profiles and Wikipedia",
  });
  if (hasKnowledgeGraph) score += 4;

  const brandMentions = (text.match(/\b(we|our|company|brand)\b/gi) || []).length;
  const hasBrandClarity = brandMentions > 5;
  items.push({
    name: "Brand Clarity",
    passed: hasBrandClarity,
    details: hasBrandClarity
      ? "Clear brand positioning"
      : "Weak brand presence",
    fixSuggestion:
      "Explicitly state who you are, what you do, and who you serve",
  });
  if (hasBrandClarity) score += 4;

  return { score, max: WEIGHTS.entityClarity, items };
}

function checkContentQuality(
  html: string,
  text: string,
  wordCount: number
): CategoryScore {
  const items: CheckItem[] = [];
  let score = 0;

  const hasGoodLength = wordCount >= 800 && wordCount <= 3000;
  items.push({
    name: "Content Length",
    passed: hasGoodLength,
    details: `${wordCount} words`,
    fixSuggestion:
      wordCount < 800
        ? "Expand content to 800+ words"
        : wordCount > 3000
          ? "Consider breaking into smaller pages"
          : "",
  });
  if (wordCount >= 800) score += 4;
  if (wordCount <= 3000) score += 1;

  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const hasGoodStructure = h2Count >= 2;
  items.push({
    name: "Heading Structure",
    passed: hasGoodStructure,
    details: hasGoodStructure
      ? "Good heading hierarchy"
      : "Missing or weak headings",
    fixSuggestion: "Use H2 and H3 tags to organize content into clear sections",
  });
  if (hasGoodStructure) score += 4;

  const hasCitations =
    /\b(source|according to|citation|study|research)\b/i.test(text);
  items.push({
    name: "External Citations",
    passed: hasCitations,
    details: hasCitations
      ? "References external sources"
      : "No external citations found",
    fixSuggestion: "Cite authoritative sources to build trust with AI systems",
  });
  if (hasCitations) score += 4;

  const hasData = /\d+%|\d+ percent|\d+\.\d+/.test(text);
  items.push({
    name: "Data & Statistics",
    passed: hasData,
    details: hasData ? "Contains data points" : "No statistics detected",
    fixSuggestion: "Include specific numbers, percentages, and statistics",
  });
  if (hasData) score += 3;

  return { score, max: WEIGHTS.contentQuality, items };
}

function generateRecommendations(
  categories: AIReadinessScore["categories"]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const addFromCategory = (
    category: CategoryScore,
    categoryName: string,
    priority: Recommendation["priority"],
    effort: Recommendation["estimatedEffort"]
  ) => {
    for (const item of category.items) {
      if (!item.passed && item.fixSuggestion) {
        recommendations.push({
          priority,
          category: categoryName,
          title: item.name,
          description: item.details || `Missing ${item.name.toLowerCase()}`,
          fix: item.fixSuggestion,
          estimatedEffort: effort,
        });
      }
    }
  };

  addFromCategory(
    categories.structuredData,
    "Structured Data",
    "high",
    "1hour"
  );
  addFromCategory(
    categories.answerExtractability,
    "Answer Extractability",
    "high",
    "2hours"
  );
  addFromCategory(categories.llmsTxt, "LLMs.txt", "medium", "15min");
  addFromCategory(
    categories.aiCrawlerAccess,
    "AI Crawler Access",
    "critical",
    "15min"
  );
  addFromCategory(
    categories.entityClarity,
    "Entity Clarity",
    "medium",
    "1hour"
  );
  addFromCategory(
    categories.contentQuality,
    "Content Quality",
    "medium",
    "2hours"
  );

  const priorityOrder: Record<Recommendation["priority"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return recommendations
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 10);
}
