export type ChartData = {
  id: string;
  type: "bar" | "line" | "area";
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
};

export type PrioritizedAction = {
  priority: number;
  action: string;
  layer: string;
  severity: string;
  estimatedImpact: number;
  effort: "low" | "medium" | "high";
  gapId?: string;
};

export type OpportunityAnalysis = {
  currentSOV: number;
  potentialSOV: number;
  additionalCitations: number;
  estimatedTrafficValue: number;
  estimatedRevenueImpact: number;
};

export type RealTimeROI = {
  improvementRate: number;
  valueDelivered: number;
  timeToBreakEven: number;
  projectedMonthlyValue: number;
};

export type ClientFacingROI = {
  executiveSummary: string;
  charts: ChartData[];
  recommendations: PrioritizedAction[];
  confidenceScore: number;
};

export type PredictiveROI = {
  clientId: string;
  clientName: string;
  monthlyRetainer: number;
  lastUpdated: string;
  opportunityAnalysis: OpportunityAnalysis;
  realTimeROI: RealTimeROI;
  clientFacing: ClientFacingROI;
};

/** Subset exposed to client portal when shareWithClient is enabled. */
export type ClientPortalROI = {
  opportunityAnalysis: OpportunityAnalysis;
  realTimeROI: Pick<RealTimeROI, "valueDelivered" | "projectedMonthlyValue" | "improvementRate">;
  clientFacing: ClientFacingROI;
  lastUpdated: string;
};
