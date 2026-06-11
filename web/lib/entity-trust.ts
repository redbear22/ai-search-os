import type { AIReadinessFetchData } from "@/lib/ai-readiness-types";

export interface ReviewMention {
  platform: string;
  found: boolean;
  url?: string;
}

export interface PublicationMention {
  publication: string;
  found: boolean;
  url?: string;
}

export interface CommunityMention {
  site: string;
  found: boolean;
  url?: string;
}

export interface AuthorCredential {
  name: string;
  credential?: string;
}

export interface Certification {
  name: string;
  found: boolean;
}

export interface Award {
  name: string;
  found: boolean;
}

export interface EntityFootprint {
  score: number;
  napConsistency: number;
  schemaMarkup: string[];
  knowledgeGraphConnected: boolean;
  wikipediaPage: boolean;
  credibleCitations: number;
}

export interface ThirdPartyMentions {
  score: number;
  reviewPlatforms: ReviewMention[];
  industryPublications: PublicationMention[];
  communitySites: CommunityMention[];
  totalMentions: number;
  sentimentScore: number;
}

export interface TrustSignals {
  score: number;
  authorCredentials: AuthorCredential[];
  certifications: Certification[];
  caseStudies: number;
  awards: Award[];
  yearsInBusiness: number;
}

export interface CommunityPresence {
  score: number;
  redditMentions: number;
  youtubeMentions: number;
  quoraAnswers: number;
  githubStars?: number;
  trustpilotRating?: number;
}

export interface TrustRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  fix: string;
  expectedTrustBoost: number;
}

export interface EntityTrustScore {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  entityFootprint: EntityFootprint;
  thirdPartyMentions: ThirdPartyMentions;
  trustSignals: TrustSignals;
  communityPresence: CommunityPresence;
  recommendations: TrustRecommendation[];
}

const SCHEMA_TYPES = [
  "Organization",
  "LocalBusiness",
  "Corporation",
  "Product",
  "Article",
  "Person",
  "FAQPage",
] as const;

const CERT_KEYWORDS = [
  "SOC 2",
  "SOC2",
  "ISO 27001",
  "ISO 9001",
  "HIPAA",
  "GDPR",
  "PCI DSS",
];

const AWARD_KEYWORDS = ["award", "winner", "finalist", "recognized by"];

const REVIEW_PLATFORMS = [
  { name: "G2", pattern: /g2\.com/i },
  { name: "Capterra", pattern: /capterra\.com/i },
  { name: "Trustpilot", pattern: /trustpilot\.com/i },
  { name: "Product Hunt", pattern: /producthunt\.com/i },
];

const PUBLICATION_PATTERNS = [
  { name: "Forbes", pattern: /forbes\.com/i },
  { name: "TechCrunch", pattern: /techcrunch\.com/i },
  { name: "Wired", pattern: /wired\.com/i },
  { name: "Gartner", pattern: /gartner\.com/i },
];

function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function normalizeDomain(domain: string): string {
  const trimmed = domain.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

async function fetchDomainPage(domain: string): Promise<AIReadinessFetchData | null> {
  const url = normalizeDomain(domain);

  try {
    const response = await fetch(
      `${getAppBaseUrl()}/api/ai-readiness/fetch?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();
    if (!response.ok) return null;
    return data as AIReadinessFetchData;
  } catch {
    return null;
  }
}

function extractSchemaTypes(html: string): string[] {
  const found: string[] = [];
  for (const type of SCHEMA_TYPES) {
    if (html.includes(type)) found.push(type);
  }
  return [...new Set(found)];
}

function countCredibleCitations(html: string): number {
  const links = html.match(/href=["']https?:\/\/[^"']+["']/gi) || [];
  return links.filter((link) => /\.(edu|gov)\//i.test(link)).length;
}

function estimateNapConsistency(
  html: string,
  text: string,
  brandName: string
): number {
  let points = 0;
  const brandLower = brandName.toLowerCase();

  if (text.toLowerCase().includes(brandLower)) points += 25;
  if (/<title[^>]*>[\s\S]*<\/title>/i.test(html) && html.toLowerCase().includes(brandLower)) {
    points += 20;
  }
  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) points += 20;
  if (/\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|blvd)\b/i.test(text)) {
    points += 20;
  }
  if (html.includes("sameAs") || html.includes("telephone")) points += 15;

  return Math.min(100, points);
}

async function checkWikipedia(brandName: string): Promise<boolean> {
  const slug = encodeURIComponent(brandName.trim().replace(/\s+/g, "_"));

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
      { next: { revalidate: 86400 } }
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function checkKnowledgeGraph(brandName: string): Promise<boolean> {
  const apiKey = process.env.GOOGLE_KNOWLEDGE_API_KEY?.trim();
  if (!apiKey) return false;

  try {
    const response = await fetch(
      `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(brandName)}&limit=1&key=${apiKey}`
    );
    if (!response.ok) return false;
    const data = (await response.json()) as {
      itemListElement?: unknown[];
    };
    return (data.itemListElement?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

async function analyzeEntityFootprint(
  brandName: string,
  domain: string,
  page: AIReadinessFetchData | null
): Promise<EntityFootprint> {
  const html = page?.html ?? "";
  const text = page?.text ?? "";

  const schemaMarkup = extractSchemaTypes(html);
  const napConsistency = estimateNapConsistency(html, text, brandName);
  const credibleCitations = countCredibleCitations(html);
  const knowledgeGraphConnected =
    html.includes("sameAs") ||
    html.includes("knowsAbout") ||
    (await checkKnowledgeGraph(brandName));
  const wikipediaPage = await checkWikipedia(brandName);

  let score = 0;
  score += napConsistency * 0.3;
  score += Math.min(20, schemaMarkup.length * 5);
  if (knowledgeGraphConnected) score += 15;
  if (wikipediaPage) score += 10;
  score += Math.min(15, credibleCitations * 5);

  return {
    score: Math.min(100, Math.round(score)),
    napConsistency,
    schemaMarkup,
    knowledgeGraphConnected,
    wikipediaPage,
    credibleCitations,
  };
}

function countPatternMatches(html: string, pattern: RegExp): number {
  return (html.match(new RegExp(pattern.source, "gi")) || []).length;
}

async function scanThirdPartyMentions(
  brandName: string,
  page: AIReadinessFetchData | null
): Promise<ThirdPartyMentions> {
  const html = page?.html ?? "";

  const reviewPlatforms: ReviewMention[] = REVIEW_PLATFORMS.map((p) => ({
    platform: p.name,
    found: p.pattern.test(html),
    url: p.pattern.test(html) ? undefined : `https://www.google.com/search?q=${encodeURIComponent(`${brandName} ${p.name}`)}`,
  }));

  const industryPublications: PublicationMention[] = PUBLICATION_PATTERNS.map(
    (p) => ({
      publication: p.name,
      found: p.pattern.test(html),
    })
  );

  const communitySites: CommunityMention[] = [
    { site: "Reddit", found: /reddit\.com/i.test(html) },
    { site: "YouTube", found: /youtube\.com|youtu\.be/i.test(html) },
    { site: "Quora", found: /quora\.com/i.test(html) },
  ];

  const wikipediaPage = await checkWikipedia(brandName);
  const totalMentions =
    reviewPlatforms.filter((r) => r.found).length +
    industryPublications.filter((p) => p.found).length +
    communitySites.filter((c) => c.found).length +
    (wikipediaPage ? 1 : 0);

  const positiveSignals = (page?.text ?? "").toLowerCase();
  const positiveWords = ["trusted", "recommend", "excellent", "leader", "award"];
  const negativeWords = ["scam", "complaint", "lawsuit", "warning"];
  let sentiment = 0.5;
  for (const w of positiveWords) if (positiveSignals.includes(w)) sentiment += 0.08;
  for (const w of negativeWords) if (positiveSignals.includes(w)) sentiment -= 0.12;
  const sentimentScore = Math.max(0, Math.min(1, sentiment));

  const score = Math.min(
    100,
    Math.round(totalMentions * 12 + sentimentScore * 20)
  );

  return {
    score,
    reviewPlatforms,
    industryPublications,
    communitySites,
    totalMentions,
    sentimentScore,
  };
}

function extractYearsInBusiness(text: string): number {
  const sinceMatch = text.match(
    /\b(?:since|founded|established)\s+(?:in\s+)?(19|20)\d{2}\b/i
  );
  if (!sinceMatch) return 0;

  const year = parseInt(sinceMatch[0].replace(/\D/g, "").slice(-4), 10);
  if (Number.isNaN(year)) return 0;

  return Math.max(0, new Date().getFullYear() - year);
}

async function aggregateTrustSignals(
  page: AIReadinessFetchData | null
): Promise<TrustSignals> {
  const html = page?.html ?? "";
  const text = (page?.text ?? "").toLowerCase();

  const authorCredentials: AuthorCredential[] = [];
  const bylineMatch = html.match(
    /(?:by|author|written by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi
  );
  if (bylineMatch) {
    for (const hit of bylineMatch.slice(0, 3)) {
      authorCredentials.push({ name: hit.replace(/^by\s+/i, "").trim() });
    }
  }

  const certifications: Certification[] = CERT_KEYWORDS.map((name) => ({
    name,
    found: text.includes(name.toLowerCase()),
  }));

  const caseStudies = (
    text.match(/case study|customer story|success story/g) || []
  ).length;

  const awards: Award[] = AWARD_KEYWORDS.map((keyword) => ({
    name: keyword,
    found: text.includes(keyword),
  }));

  const yearsInBusiness = extractYearsInBusiness(page?.text ?? "");

  let score = 20;
  score += Math.min(30, yearsInBusiness * 3);
  score += Math.min(20, caseStudies * 4);
  score += certifications.filter((c) => c.found).length * 8;
  score += awards.filter((a) => a.found).length * 5;
  score += Math.min(10, authorCredentials.length * 3);

  return {
    score: Math.min(100, Math.round(score)),
    authorCredentials,
    certifications,
    caseStudies,
    awards,
    yearsInBusiness,
  };
}

async function analyzeCommunityPresence(
  page: AIReadinessFetchData | null
): Promise<CommunityPresence> {
  const html = page?.html ?? "";

  const redditMentions = countPatternMatches(html, /reddit\.com/i);
  const youtubeMentions = countPatternMatches(html, /youtube\.com|youtu\.be/i);
  const quoraAnswers = countPatternMatches(html, /quora\.com/i);

  const githubMatch = html.match(/github\.com\/[^/"'\s]+/i);
  const trustpilotMatch = html.match(/trustpilot\.com\/review\/[^/"'\s]+/i);

  let score = 0;
  score += Math.min(40, redditMentions * 15);
  score += Math.min(30, youtubeMentions * 10);
  score += Math.min(20, quoraAnswers * 10);
  if (githubMatch) score += 5;
  if (trustpilotMatch) score += 5;

  return {
    score: Math.min(100, Math.round(score)),
    redditMentions,
    youtubeMentions,
    quoraAnswers,
    githubStars: undefined,
    trustpilotRating: undefined,
  };
}

function calculateEntityGrade(score: number): EntityTrustScore["grade"] {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function generateTrustRecommendations(
  entity: EntityFootprint,
  mentions: ThirdPartyMentions,
  trust: TrustSignals,
  community: CommunityPresence
): TrustRecommendation[] {
  const recommendations: TrustRecommendation[] = [];

  if (!entity.knowledgeGraphConnected) {
    recommendations.push({
      priority: "critical",
      category: "Entity Footprint",
      title: "Not in Google Knowledge Graph",
      description:
        "AI systems may struggle to verify your brand as a legitimate entity",
      fix: "Implement schema markup, claim your Knowledge Panel, build Wikipedia presence",
      expectedTrustBoost: 30,
    });
  }

  if (!entity.wikipediaPage) {
    recommendations.push({
      priority: "high",
      category: "Entity Footprint",
      title: "No Wikipedia presence",
      description: "Wikipedia is a strong entity trust signal for AI systems",
      fix: "Build notability through press coverage, then pursue a Wikipedia article",
      expectedTrustBoost: 20,
    });
  }

  if (entity.napConsistency < 60) {
    recommendations.push({
      priority: "high",
      category: "Entity Footprint",
      title: "Weak NAP consistency",
      description: "Name, address, and phone signals are inconsistent or missing",
      fix: "Align NAP across site footer, contact page, and Organization schema",
      expectedTrustBoost: 15,
    });
  }

  if (mentions.totalMentions < 3) {
    recommendations.push({
      priority: "high",
      category: "Third-Party Mentions",
      title: "Limited third-party validation",
      description: `Only ${mentions.totalMentions} third-party signals detected on your site`,
      fix: "Launch review acquisition, pursue industry publications, link social proof",
      expectedTrustBoost: 25,
    });
  }

  if (trust.caseStudies < 3) {
    recommendations.push({
      priority: "medium",
      category: "Trust Signals",
      title: "Few case studies or results",
      description: `Only ${trust.caseStudies} case study signals found`,
      fix: "Document customer success stories with measurable outcomes",
      expectedTrustBoost: 15,
    });
  }

  if (trust.certifications.filter((c) => c.found).length === 0) {
    recommendations.push({
      priority: "medium",
      category: "Trust Signals",
      title: "No visible certifications",
      description: "Security and compliance badges build AI trust selection",
      fix: "Display SOC 2, ISO, or industry certifications on key pages",
      expectedTrustBoost: 12,
    });
  }

  if (community.redditMentions < 1 && community.youtubeMentions < 1) {
    recommendations.push({
      priority: "medium",
      category: "Community Presence",
      title: "Low community engagement signals",
      description: "Few Reddit, YouTube, or Quora references linked from your property",
      fix: "Participate in communities and surface UGC links from your site",
      expectedTrustBoost: 10,
    });
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

export async function calculateEntityTrust(
  brandName: string,
  domain: string
): Promise<EntityTrustScore> {
  const page = await fetchDomainPage(domain);

  const [entityFootprint, thirdPartyMentions, trustSignals, communityPresence] =
    await Promise.all([
      analyzeEntityFootprint(brandName, domain, page),
      scanThirdPartyMentions(brandName, page),
      aggregateTrustSignals(page),
      analyzeCommunityPresence(page),
    ]);

  const overall = Math.round(
    entityFootprint.score * 0.35 +
      thirdPartyMentions.score * 0.25 +
      trustSignals.score * 0.25 +
      communityPresence.score * 0.15
  );

  const grade = calculateEntityGrade(overall);
  const recommendations = generateTrustRecommendations(
    entityFootprint,
    thirdPartyMentions,
    trustSignals,
    communityPresence
  );

  return {
    overall,
    grade,
    entityFootprint,
    thirdPartyMentions,
    trustSignals,
    communityPresence,
    recommendations,
  };
}
