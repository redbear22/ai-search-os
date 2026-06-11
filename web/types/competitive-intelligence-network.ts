export type CitationPlatformId = "chatgpt" | "perplexity" | "claude" | "gemini";

export type InsightCategory =
  | "roi"
  | "citation"
  | "audit_frequency"
  | "competitor"
  | "publication"
  | "network";

export type NetworkInsight = {
  id: string;
  category: InsightCategory;
  headline: string;
  detail: string;
  confidence: number;
  industry?: string;
  metric?: string;
  source: "computed" | "rules" | "early_signal";
  label?: string;
};

export type NetworkBenchmark = {
  industry: string;
  metric: string;
  value: number;
  sampleSize: number;
  unit?: string;
};

export type CitationPlatformData = {
  platform: CitationPlatformId;
  label: string;
  citationVolume: number;
  avgAuthorityScore: number;
  brandMentionRate: number;
  trend: "up" | "down" | "stable";
  source: "computed" | "seed";
};

export type PublicationPattern = {
  publication: string;
  authorityMultiplier: number;
  category: string;
  sampleCitations: number;
};

export type CompetitorChangeSignal = {
  signalType: "gap_spike" | "domain_change" | "citation_shift" | "visibility_drop";
  industry: string;
  severity: "low" | "medium" | "high";
  description: string;
  detectedAt: string;
  source: "rules";
};

export type DataSourceStatus = {
  id: string;
  name: string;
  status: "active" | "sparse" | "seed";
  recordCount: number;
  lastUpdated: string;
};

export type NetworkEffects = {
  clientCount: number;
  auditCount: number;
  learningRecordCount: number;
  networkStrength: number;
  flywheel: Array<{ step: string; description: string }>;
};

export type CompetitiveIntelligenceNetwork = {
  agencyId: string;
  exclusiveAccess: boolean;
  networkEffects: NetworkEffects;
  dataSources: DataSourceStatus[];
  insights: NetworkInsight[];
  benchmarks: NetworkBenchmark[];
  citationPlatforms: CitationPlatformData[];
  publicationPatterns: PublicationPattern[];
  competitorSignals: CompetitorChangeSignal[];
  computedAt: string;
  source: "rules";
};

export type ClientNetworkComparison = {
  clientId: string;
  clientIndustry: string;
  network: CompetitiveIntelligenceNetwork;
  clientVsNetwork: Array<{
    metric: string;
    clientValue: number;
    networkValue: number;
    delta: number;
    unit?: string;
  }>;
  relevantInsights: NetworkInsight[];
};

export type PortalNetworkInsights = {
  exclusiveAccess: true;
  networkStrength: number;
  insights: NetworkInsight[];
  topBenchmark?: NetworkBenchmark;
  computedAt: string;
};
