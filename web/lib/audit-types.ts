export type AIPlatform = "chatgpt" | "perplexity" | "claude" | "gemini";

export type AuditLayerId = "discoverability" | "clarity" | "authority" | "trust";

export interface CompetitorRow {
  name: string;
  traffic: number;
  aiVisibility: number;
  brandMentions: number;
}

export interface PlatformClarity {
  responseText: string;
  correctItems: string[];
  wrongItems: string[];
  missingItems: string[];
}

export interface DiscoverabilityLayer {
  seo: {
    traffic: number;
    keywords: number;
    siteHealth: number;
  };
  aso: {
    aiVisibilityScore: number;
    brandMentions: number;
  };
  competitors: CompetitorRow[];
}

export interface ClarityComparisonMeta {
  analyzedAt: string | null;
  consensusCorrect: string[];
}

export interface ClarityLayer {
  platforms: Record<AIPlatform, PlatformClarity>;
  comparison?: ClarityComparisonMeta;
}

export interface AuthorityLayer {
  backlinksCount: number;
  citedPages: number;
  sourcesCitingUs: string[];
  sourcesCitingCompetitorsOnly: string[];
}

export interface TrustLayer {
  sentimentScore: number;
  reviewCount: number;
  averageRating: number;
  hedgedLanguageDetected: boolean;
}

export interface AuditData {
  discoverability: DiscoverabilityLayer;
  clarity: ClarityLayer;
  authority: AuthorityLayer;
  trust: TrustLayer;
}

export const AUDIT_LAYER_META: { id: AuditLayerId; title: string; desc: string }[] = [
  { id: "discoverability", title: "Discoverability", desc: "SEO + ASO metrics and competitor benchmarks" },
  { id: "clarity", title: "Clarity", desc: "Per-platform response accuracy audit" },
  { id: "authority", title: "Authority", desc: "Backlinks and citation sources" },
  { id: "trust", title: "Trust", desc: "Sentiment, reviews, hedged language" },
];
