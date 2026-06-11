import type { AIReadinessFetchData } from "@/lib/ai-readiness-types";

export interface SemanticStructureScore {
  score: number;
  max: 20;
  headingHierarchy: number;
  listDensity: number;
  tablePresence: boolean;
  schemaMarkup: string[];
}

export interface ExtractabilityScore {
  score: number;
  max: 20;
  directAnswers: number;
  paragraphClarity: number;
  bulletPoints: number;
  numberedSteps: number;
}

export interface EntityDensityScore {
  score: number;
  max: 15;
  entitiesFound: string[];
  entityRelations: string[];
  knowledgeGraphLinks: number;
}

export interface ContextualDepthScore {
  score: number;
  max: 15;
  wordCount: number;
  uniqueConcepts: number;
  internalLinks: number;
  externalCitations: number;
}

export interface MultiQueryScore {
  score: number;
  max: 15;
  queryCoverage: string[];
  relatedTopics: string[];
  questionAnswerPairs: number;
}

export interface AgentSignalScore {
  score: number;
  max: 15;
  llmsTxtPresent: boolean;
  robotsTxtAIOptimized: boolean;
  agentHeaders: string[];
  originSignals: number;
}

export interface AgentOptimization {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  fix: string;
  estimatedImpact: number;
  estimatedEffort: "15min" | "1hour" | "2hours" | "4hours";
}

export interface AgentSimulationResult {
  wouldAgentExtract: boolean;
  extractionConfidence: number;
  extractedAnswer?: string;
  citedSources: string[];
  missingContext: string[];
}

export interface AgentReadinessScore {
  overall: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  categories: {
    semanticStructure: SemanticStructureScore;
    extractability: ExtractabilityScore;
    entityDensity: EntityDensityScore;
    contextualDepth: ContextualDepthScore;
    multiQueryOptimization: MultiQueryScore;
    agentSignals: AgentSignalScore;
  };
  recommendations: AgentOptimization[];
  agentSimulation: AgentSimulationResult;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "have",
  "are",
  "was",
  "were",
  "about",
  "your",
  "their",
  "which",
  "when",
  "where",
  "what",
  "into",
  "than",
  "then",
  "also",
  "more",
  "most",
  "some",
  "such",
  "only",
  "other",
  "been",
  "being",
]);

const AI_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
];

function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function fetchPageForAgentReadiness(
  url: string
): Promise<AIReadinessFetchData> {
  const response = await fetch(
    `${getAppBaseUrl()}/api/ai-readiness/fetch?url=${encodeURIComponent(url)}`
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? `Failed to fetch page (${response.status})`);
  }

  return data as AIReadinessFetchData;
}

export async function calculateAgentReadinessFromUrl(
  url: string
): Promise<AgentReadinessScore> {
  const page = await fetchPageForAgentReadiness(url);
  return calculateAgentReadiness(url, page.html, page.text, page);
}

export async function calculateAgentReadiness(
  url: string,
  html: string,
  text: string,
  pageData?: AIReadinessFetchData
): Promise<AgentReadinessScore> {
  const semanticStructure = analyzeSemanticStructure(html);
  const extractability = analyzeExtractability(html, text);
  const entityDensity = analyzeEntityDensity(text);
  const contextualDepth = analyzeContextualDepth(html, text);
  const multiQuery = analyzeMultiQueryOptimization(text);
  const agentSignals = analyzeAgentSignals(url, html, text, pageData);

  const totalScore =
    semanticStructure.score +
    extractability.score +
    entityDensity.score +
    contextualDepth.score +
    multiQuery.score +
    agentSignals.score;

  const overall = Math.min(100, Math.round(totalScore));
  const grade = calculateGrade(overall);
  const agentSimulation = simulateAgentExtraction(text, url);

  const recommendations = generateAgentOptimizations({
    semanticStructure,
    extractability,
    entityDensity,
    contextualDepth,
    multiQueryOptimization: multiQuery,
    agentSignals,
    agentSimulation,
  });

  return {
    overall,
    grade,
    categories: {
      semanticStructure,
      extractability,
      entityDensity,
      contextualDepth,
      multiQueryOptimization: multiQuery,
      agentSignals,
    },
    recommendations,
    agentSimulation,
  };
}

function analyzeSemanticStructure(html: string): SemanticStructureScore {
  let score = 0;
  let headingHierarchy = 0;
  let listDensity = 0;
  const schemaMarkup: string[] = [];

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const h3Count = (html.match(/<h3[\s>]/gi) || []).length;

  if (h1Count === 1 && h2Count >= 2 && h3Count >= 2) {
    headingHierarchy = 8;
    score += 8;
  } else if (h1Count === 1 && h2Count >= 1) {
    headingHierarchy = 5;
    score += 5;
  } else {
    headingHierarchy = 2;
    score += 2;
  }

  const liCount = (html.match(/<li[\s>]/gi) || []).length;
  listDensity = Math.min(8, Math.floor(liCount / 3) * 2);
  score += listDensity;

  const tablePresence = /<table[\s>]/i.test(html);
  if (tablePresence) score += 4;

  const jsonLdBlocks = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (jsonLdBlocks) {
    for (const block of jsonLdBlocks) {
      if (block.includes("Organization")) schemaMarkup.push("Organization");
      if (block.includes("Product")) schemaMarkup.push("Product");
      if (block.includes("Article")) schemaMarkup.push("Article");
      if (block.includes("FAQPage")) schemaMarkup.push("FAQPage");
      if (block.includes("HowTo")) schemaMarkup.push("HowTo");
    }
    score += Math.min(4, [...new Set(schemaMarkup)].length);
  }

  return {
    score: Math.min(20, score),
    max: 20,
    headingHierarchy,
    listDensity,
    tablePresence,
    schemaMarkup: [...new Set(schemaMarkup)],
  };
}

function analyzeExtractability(html: string, text: string): ExtractabilityScore {
  let score = 0;

  const sentences = text.split(/[.!?]+/);
  const answerStarters = [
    "is",
    "are",
    "was",
    "were",
    "has",
    "have",
    "provides",
    "offers",
    "includes",
  ];

  let directAnswers = 0;
  for (const sentence of sentences) {
    const trimmed = sentence.trim().toLowerCase();
    if (answerStarters.some((starter) => trimmed.startsWith(starter))) {
      directAnswers++;
    }
  }
  directAnswers = Math.min(8, directAnswers);
  score += directAnswers;

  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  let goodParagraphs = 0;
  for (const p of paragraphs) {
    const wordCount = p.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean)
      .length;
    if (wordCount >= 50 && wordCount <= 150) goodParagraphs++;
  }
  const paragraphClarity = Math.min(6, Math.floor(goodParagraphs / 2));
  score += paragraphClarity;

  const bulletPoints = (html.match(/<li[^>]*>[\s\S]*?<\/li>/gi) || []).length;
  score += Math.min(4, Math.floor(bulletPoints / 3));

  const numberedSteps = (html.match(/<li[^>]*>\s*\d+\./gi) || []).length;
  score += Math.min(2, numberedSteps);

  return {
    score: Math.min(20, score),
    max: 20,
    directAnswers,
    paragraphClarity,
    bulletPoints,
    numberedSteps,
  };
}

function analyzeEntityDensity(text: string): EntityDensityScore {
  let score = 0;
  const entitiesFound: string[] = [];

  const patterns = {
    product: /\b[A-Z][a-z]+ (?:Pro|Max|Plus|Lite|Enterprise)\b/g,
    person:
      /\b(?:CEO|Founder|Director|Dr\.|Prof\.) [A-Z][a-z]+ [A-Z][a-z]+\b/g,
    company:
      /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Technologies|Software)\b/g,
    technology:
      /\b(?:AI|ML|NLP|LLM|GPT|API|SaaS|Cloud|Blockchain)\b/g,
  };

  for (const pattern of Object.values(patterns)) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      if (!entitiesFound.includes(match)) entitiesFound.push(match);
    }
  }

  const uniqueEntities = [...new Set(entitiesFound)];
  score += Math.min(8, Math.floor(uniqueEntities.length / 2));

  const entityRelations: string[] = [];
  for (let i = 0; i < uniqueEntities.length; i++) {
    for (let j = i + 1; j < uniqueEntities.length; j++) {
      const entity1 = escapeRegex(uniqueEntities[i]);
      const entity2 = escapeRegex(uniqueEntities[j]);
      const pattern = new RegExp(
        `${entity1}.{0,50}${entity2}|${entity2}.{0,50}${entity1}`,
        "i"
      );
      if (pattern.test(text)) {
        entityRelations.push(`${uniqueEntities[i]} → ${uniqueEntities[j]}`);
      }
    }
  }
  score += Math.min(4, entityRelations.length);

  const knowledgeGraphLinks = (text.match(/sameAs/gi) || []).length;
  score += Math.min(3, knowledgeGraphLinks);

  return {
    score: Math.min(15, score),
    max: 15,
    entitiesFound: uniqueEntities.slice(0, 10),
    entityRelations: entityRelations.slice(0, 5),
    knowledgeGraphLinks,
  };
}

function analyzeContextualDepth(
  html: string,
  text: string
): ContextualDepthScore {
  let score = 0;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount >= 1200 && wordCount <= 2500) score += 6;
  else if (wordCount >= 800 && wordCount <= 3500) score += 4;
  else if (wordCount >= 500) score += 2;

  const nouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  const uniqueConcepts = [...new Set(nouns)].slice(0, 50);
  score += Math.min(4, Math.floor(uniqueConcepts.length / 10));

  const internalLinks = (html.match(/href=["']\/[^"']+["']/gi) || []).length;
  score += Math.min(3, Math.floor(internalLinks / 5));

  const externalLinks = (
    html.match(/href=["']https?:\/\/(?!.*localhost)[^"']+["']/gi) || []
  ).length;
  score += Math.min(2, Math.floor(externalLinks / 3));

  return {
    score: Math.min(15, score),
    max: 15,
    wordCount,
    uniqueConcepts: uniqueConcepts.length,
    internalLinks,
    externalCitations: externalLinks,
  };
}

function analyzeMultiQueryOptimization(text: string): MultiQueryScore {
  let score = 0;
  const queryCoverage: string[] = [];
  const lower = text.toLowerCase();

  const questionMatches = text.match(/[A-Z][^.!?]*\?/g) || [];
  const questionAnswerPairs = questionMatches.length;
  score += Math.min(5, questionAnswerPairs);

  const queryPatterns = [
    "what is",
    "how to",
    "why does",
    "when should",
    "which is best",
    "compare",
    "vs",
    "versus",
    "top",
    "best",
    "review",
    "guide",
  ];

  for (const pattern of queryPatterns) {
    if (lower.includes(pattern)) queryCoverage.push(pattern);
  }
  score += Math.min(5, queryCoverage.length);

  const words = lower.split(/\s+/);
  const wordFreq: Record<string, number> = {};
  for (const word of words) {
    if (word.length > 4 && !STOP_WORDS.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }
  const relatedTopics = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  score += Math.min(5, relatedTopics.length);

  return {
    score: Math.min(15, score),
    max: 15,
    queryCoverage,
    relatedTopics,
    questionAnswerPairs,
  };
}

function analyzeAgentSignals(
  url: string,
  html: string,
  text: string,
  pageData?: AIReadinessFetchData
): AgentSignalScore {
  let score = 0;
  const agentHeaders: string[] = [];

  const llmsTxtPresent = pageData?.llmsTxtOk ?? false;
  if (llmsTxtPresent) score += 6;

  const robotsTxt = pageData?.robotsTxt ?? "";
  for (const crawler of AI_CRAWLERS) {
    if (robotsTxt.toLowerCase().includes(crawler.toLowerCase())) {
      agentHeaders.push(crawler);
    }
  }
  const robotsTxtAIOptimized = agentHeaders.length >= 2;
  if (robotsTxtAIOptimized) score += 4;

  const invisiblePattern = /\u200B|\u200C|\u200D|\uFEFF/g;
  const originInContent =
    (html.match(invisiblePattern) || []).length +
    (text.match(invisiblePattern) || []).length;
  const citeSignals = /CITE:[a-z0-9]+:\d+:[a-z0-9]+/i.test(html + text)
    ? 1
    : 0;
  const originSignals = originInContent + citeSignals;
  score += Math.min(5, originSignals);

  return {
    score: Math.min(15, score),
    max: 15,
    llmsTxtPresent,
    robotsTxtAIOptimized,
    agentHeaders,
    originSignals,
  };
}

function simulateAgentExtraction(
  text: string,
  url: string
): AgentSimulationResult {
  const lower = text.toLowerCase();
  const wouldAgentExtract =
    text.length > 500 && lower.includes(" is ") && lower.includes("provides");

  let extractionConfidence = 0;
  if (wouldAgentExtract) extractionConfidence += 30;
  if (text.length > 1000) extractionConfidence += 20;
  if (lower.includes("summary") || lower.includes("overview")) {
    extractionConfidence += 20;
  }
  if (lower.includes("key features") || lower.includes("benefits")) {
    extractionConfidence += 15;
  }
  extractionConfidence = Math.min(95, extractionConfidence + 15);

  const firstSentence = text.split(/[.!?]/)[0]?.trim();
  const extractedAnswer = wouldAgentExtract ? firstSentence : undefined;

  const missingContext: string[] = [];
  if (!lower.includes("what")) missingContext.push("Problem statement");
  if (!lower.includes("how")) missingContext.push("Process explanation");
  if (!lower.includes("why")) missingContext.push("Value proposition");

  return {
    wouldAgentExtract,
    extractionConfidence,
    extractedAnswer,
    citedSources: [url],
    missingContext,
  };
}

interface OptimizationInput {
  semanticStructure: SemanticStructureScore;
  extractability: ExtractabilityScore;
  entityDensity: EntityDensityScore;
  contextualDepth: ContextualDepthScore;
  multiQueryOptimization: MultiQueryScore;
  agentSignals: AgentSignalScore;
  agentSimulation: AgentSimulationResult;
}

function generateAgentOptimizations(
  scores: OptimizationInput
): AgentOptimization[] {
  const recommendations: AgentOptimization[] = [];

  if (scores.semanticStructure.score < 12) {
    recommendations.push({
      priority: "high",
      category: "Semantic Structure",
      title: "Improve heading hierarchy",
      description:
        "Content lacks proper H1→H2→H3 structure for agent parsing",
      fix: "Ensure one H1, multiple H2s for main sections, and H3s for subsections",
      estimatedImpact: 15,
      estimatedEffort: "1hour",
    });
  }

  if (scores.extractability.score < 10) {
    recommendations.push({
      priority: "critical",
      category: "Extractability",
      title: "Add direct answer statements",
      description: "Agents struggle to find clear answers in your content",
      fix: 'Start key paragraphs with definitive statements (e.g., "X is...", "Y provides...")',
      estimatedImpact: 20,
      estimatedEffort: "2hours",
    });
  }

  if (scores.entityDensity.score < 8) {
    recommendations.push({
      priority: "high",
      category: "Entity Density",
      title: "Increase entity mentions and relationships",
      description: "Low entity density reduces agent comprehension",
      fix: "Explicitly mention product names, technologies, and their relationships",
      estimatedImpact: 12,
      estimatedEffort: "1hour",
    });
  }

  if (!scores.agentSignals.llmsTxtPresent) {
    recommendations.push({
      priority: "critical",
      category: "Agent Signals",
      title: "Create llms.txt file",
      description:
        "Missing critical AI agent guidance file (2-18% citation boost)",
      fix: "Create /llms.txt with site summary and /llms-full.txt with documentation",
      estimatedImpact: 18,
      estimatedEffort: "15min",
    });
  }

  if (scores.multiQueryOptimization.queryCoverage.length < 3) {
    recommendations.push({
      priority: "medium",
      category: "Multi-Query Optimization",
      title: "Cover more query variants",
      description: "Content optimized for too few search patterns",
      fix: 'Add sections answering "what is", "how to", "why", "vs" type queries',
      estimatedImpact: 10,
      estimatedEffort: "2hours",
    });
  }

  if (scores.agentSimulation.missingContext.length > 0) {
    recommendations.push({
      priority: "high",
      category: "Contextual Depth",
      title: "Add missing context for agent extraction",
      description: `Missing: ${scores.agentSimulation.missingContext.join(", ")}`,
      fix: "Expand content to address these missing contextual elements",
      estimatedImpact: 15,
      estimatedEffort: "2hours",
    });
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

function calculateGrade(score: number): AgentReadinessScore["grade"] {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
