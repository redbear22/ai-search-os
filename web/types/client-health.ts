export type TrendDirection = "up" | "down" | "stable";

export type PredictedIssue = {
  confidence: number;
  issue: string;
  expectedDate: string;
};

export type CompetitorInsight = {
  name: string;
  aiVisibility: number;
  brandMentions: number;
  traffic: number;
  rank: number;
  gapVsClient: number;
};

export type CompetitorBenchmarking = {
  clientRank: number;
  topCompetitors: CompetitorInsight[];
  marketShare: number;
};

export type AgencyHealthMetrics = {
  totalValueCreated: number;
  hoursSaved: number;
  clientSatisfaction: number;
};

export type ClientHealthDashboard = {
  clientId: string;
  clientName: string;
  healthScore: number;
  trendDirection: TrendDirection;
  layerScores: {
    discoverability: number;
    clarity: number;
    authority: number;
    trust: number;
    shareOfVoice: number;
  };
  predictedIssues: PredictedIssue[];
  competitorBenchmarking: CompetitorBenchmarking;
  agencyMetrics: AgencyHealthMetrics;
  lastUpdated: string;
};
