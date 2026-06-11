import type { AIReadinessFetchData } from "@/lib/ai-readiness-types";

export interface SearchAgentScore {
  score: number;
  agentDiscoverable: boolean;
  structuredForReasoning: boolean;
  entityRichness: number;
  temporalRelevance: number;
}

export interface GenerativeUIScore {
  score: number;
  interactiveElements: boolean;
  dataStructured: boolean;
  visualMetadata: boolean;
  actionButtons: boolean;
}

export interface PersonalIntelligenceScore {
  score: number;
  userContextReady: boolean;
  personalizationSignals: string[];
  privacyCompliant: boolean;
}

export interface LocalBookingScore {
  score: number;
  gbpOptimized: boolean;
  bookingEnabled: boolean;
  availabilityRealTime: boolean;
}

export interface GoogleIORecommendation {
  priority: "critical" | "high" | "medium" | "low";
  feature: string;
  title: string;
  description: string;
  fix: string;
  timeline: string;
}

export interface GoogleIOReadiness {
  overall: number;
  searchAgentQualification: SearchAgentScore;
  generativeUIReadiness: GenerativeUIScore;
  personalIntelligence: PersonalIntelligenceScore;
  localBookingAgent: LocalBookingScore;
  recommendations: GoogleIORecommendation[];
}

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

function hostFromDomain(domain: string): string {
  return normalizeDomain(domain).replace(/^https?:\/\//, "").split("/")[0];
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

function hasSchemaType(html: string, types: string[]): boolean {
  return types.some((type) => html.includes(type));
}

function parseLastModified(headers: Record<string, string>): number {
  const raw = headers["last-modified"] || headers["date"];
  if (!raw) return 50;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 50;

  const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 30) return 90;
  if (ageDays <= 90) return 70;
  if (ageDays <= 180) return 50;
  if (ageDays <= 365) return 30;
  return 15;
}

async function assessSearchAgentQualification(
  domain: string,
  page: AIReadinessFetchData | null
): Promise<SearchAgentScore> {
  let score = 0;
  const html = page?.html ?? "";
  const text = page?.text ?? "";

  const agentDiscoverable = page?.llmsTxtOk ?? false;
  if (agentDiscoverable) score += 25;

  const structuredForReasoning =
    hasSchemaType(html, ["FAQPage", "HowTo", "QAPage"]) ||
    (text.match(/\?/g) || []).length >= 3;
  if (structuredForReasoning) score += 25;

  const entitySignals = [
    "Organization",
    "LocalBusiness",
    "Product",
    "Person",
    "sameAs",
    "knowsAbout",
  ];
  const entityHits = entitySignals.filter((s) => html.includes(s)).length;
  const entityRichness = Math.min(100, entityHits * 15);
  score += entityRichness * 0.3;

  const temporalRelevance = parseLastModified(page?.headers ?? {});
  score += temporalRelevance * 0.2;

  return {
    score: Math.min(100, Math.round(score)),
    agentDiscoverable,
    structuredForReasoning,
    entityRichness,
    temporalRelevance,
  };
}

async function assessGenerativeUIReadiness(
  page: AIReadinessFetchData | null
): Promise<GenerativeUIScore> {
  let score = 0;
  const html = page?.html ?? "";
  const lower = html.toLowerCase();

  const interactiveElements =
    /<form[\s>]/i.test(html) ||
    /calculator|configurator|quiz|tool/i.test(html);
  if (interactiveElements) score += 20;

  const dataStructured = hasSchemaType(html, [
    "Product",
    "Event",
    "Recipe",
    "FAQPage",
    "HowTo",
    "Review",
    "Offer",
  ]);
  if (dataStructured) score += 35;

  const visualMetadata =
    /<video[\s>]/i.test(html) ||
    /<img[\s>]/i.test(html) ||
    /application\/ld\+json[\s\S]*image/i.test(html);
  if (visualMetadata) score += 20;

  const actionButtons =
    /\b(book|buy|schedule|reserve|order|get started|sign up)\b/i.test(lower) ||
    /"(?:potentialAction|ReserveAction|BuyAction)"/i.test(html);
  if (actionButtons) score += 25;

  return {
    score: Math.min(100, score),
    interactiveElements,
    dataStructured,
    visualMetadata,
    actionButtons,
  };
}

async function assessPersonalIntelligence(
  page: AIReadinessFetchData | null
): Promise<PersonalIntelligenceScore> {
  let score = 0;
  const html = page?.html ?? "";
  const lower = html.toLowerCase();
  const personalizationSignals: string[] = [];

  if (/login|sign in|my account|dashboard/i.test(lower)) {
    personalizationSignals.push("authenticated_experience");
  }
  if (/preferences|recommended for you|personalized/i.test(lower)) {
    personalizationSignals.push("preference_signals");
  }
  if (/history|recently viewed|saved items/i.test(lower)) {
    personalizationSignals.push("history_signals");
  }

  const userContextReady = personalizationSignals.length > 0;
  if (userContextReady) score += 50;

  const privacyCompliant =
    /privacy policy|cookie policy|gdpr|ccpa|data protection/i.test(lower);
  if (privacyCompliant) score += 50;

  return {
    score: Math.min(100, score),
    userContextReady,
    personalizationSignals,
    privacyCompliant,
  };
}

async function assessLocalBookingAgent(
  hasGbp: boolean,
  page: AIReadinessFetchData | null
): Promise<LocalBookingScore> {
  let score = 0;
  const html = page?.html ?? "";
  const lower = html.toLowerCase();

  const gbpOptimized =
    hasGbp ||
    /google\.com\/maps|g\.page|business\.google/i.test(html) ||
    hasSchemaType(html, ["LocalBusiness", "Restaurant", "LodgingBusiness"]);
  if (gbpOptimized) score += 40;

  const bookingEnabled =
    /\b(book|reserve|schedule|appointment)\b/i.test(lower) ||
    hasSchemaType(html, ["ReserveAction", "FoodEstablishmentReservation"]);
  if (bookingEnabled) score += 30;

  const availabilityRealTime =
    /availability|open now|real-?time|slots available/i.test(lower) ||
    /"openingHoursSpecification"/i.test(html);
  if (availabilityRealTime) score += 30;

  return {
    score: Math.min(100, score),
    gbpOptimized,
    bookingEnabled,
    availabilityRealTime,
  };
}

function generateGoogleIORecommendations(
  searchAgent: SearchAgentScore,
  generativeUI: GenerativeUIScore,
  personalIntelligence: PersonalIntelligenceScore,
  localBooking: LocalBookingScore
): GoogleIORecommendation[] {
  const recommendations: GoogleIORecommendation[] = [];

  if (!searchAgent.agentDiscoverable) {
    recommendations.push({
      priority: "critical",
      feature: "Search Agents",
      title: "Not discoverable by AI search agents",
      description:
        "Missing llms.txt — a primary discovery method for autonomous agents",
      fix: "Create /llms.txt with site summary and /llms-full.txt with documentation",
      timeline: "Immediate",
    });
  }

  if (!searchAgent.structuredForReasoning) {
    recommendations.push({
      priority: "high",
      feature: "Search Agents",
      title: "Weak reasoning-friendly structure",
      description: "Content lacks FAQ/HowTo schema or clear Q&A patterns",
      fix: "Add FAQPage/HowTo schema and direct question-answer sections",
      timeline: "1 week",
    });
  }

  if (searchAgent.entityRichness < 45) {
    recommendations.push({
      priority: "high",
      feature: "Search Agents",
      title: "Low entity richness",
      description: "Agents cannot map your brand to a knowledge graph entity",
      fix: "Add Organization schema with sameAs links to profiles and Wikipedia",
      timeline: "2 weeks",
    });
  }

  if (!generativeUI.dataStructured) {
    recommendations.push({
      priority: "high",
      feature: "Generative UI",
      title: "Missing structured data for interactive results",
      description:
        "Google may not generate rich, interactive previews of your content",
      fix: "Implement Product, Event, FAQ, HowTo, and Review schema markup",
      timeline: "2 weeks",
    });
  }

  if (!generativeUI.actionButtons) {
    recommendations.push({
      priority: "medium",
      feature: "Generative UI",
      title: "No actionable CTAs for generative UI",
      description: "Missing Book/Buy/Schedule actions agents can invoke",
      fix: "Add clear CTAs and ReserveAction/BuyAction schema where relevant",
      timeline: "1 week",
    });
  }

  if (!personalIntelligence.privacyCompliant) {
    recommendations.push({
      priority: "high",
      feature: "Personal Intelligence",
      title: "Privacy signals incomplete",
      description: "Personal intelligence features require visible privacy compliance",
      fix: "Publish privacy/cookie policy with GDPR/CCPA language",
      timeline: "1 week",
    });
  }

  if (!localBooking.gbpOptimized && !localBooking.bookingEnabled) {
    recommendations.push({
      priority: "high",
      feature: "Local Booking Agents",
      title: "Not optimized for AI booking agents",
      description: "Agentic booking requires GBP + on-site booking signals",
      fix: "Claim Google Business Profile, add booking schema, enable availability",
      timeline: "1 week",
    });
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

export async function calculateGoogleIOReadiness(
  domain: string,
  hasGbp: boolean = false
): Promise<GoogleIOReadiness> {
  const normalizedHost = hostFromDomain(domain);
  const page = await fetchDomainPage(normalizedHost);

  const searchAgentQualification = await assessSearchAgentQualification(
    normalizedHost,
    page
  );
  const generativeUIReadiness = await assessGenerativeUIReadiness(page);
  const personalIntelligence = await assessPersonalIntelligence(page);
  const localBookingAgent = await assessLocalBookingAgent(hasGbp, page);

  const overall = Math.round(
    searchAgentQualification.score * 0.35 +
      generativeUIReadiness.score * 0.25 +
      personalIntelligence.score * 0.25 +
      localBookingAgent.score * 0.15
  );

  const recommendations = generateGoogleIORecommendations(
    searchAgentQualification,
    generativeUIReadiness,
    personalIntelligence,
    localBookingAgent
  );

  return {
    overall,
    searchAgentQualification,
    generativeUIReadiness,
    personalIntelligence,
    localBookingAgent,
    recommendations,
  };
}
