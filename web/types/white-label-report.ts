export type ReportFrequency = "weekly" | "monthly";

export type WhiteLabelBranding = {
  agencyLogo: string | null;
  brandColor: string;
  secondaryColor: string;
  fontFamily: string;
  reportHeader: string | null;
  reportFooterText: string | null;
  agencyName: string;
  agencyLogoFallback: string | null;
  inheritsFromAgency?: boolean;
};

export type WhiteLabelReportMetrics = {
  shareOfVoice: number;
  gapCount: number;
  completedActions: number;
  improvement: number;
  discoverability: number;
  clarity: number;
  authority: number;
  trust: number;
};

export type WhiteLabelGapSummary = {
  layer: string;
  severity: string;
  title: string;
};

export type WhiteLabelReportData = {
  client: {
    id: string;
    name: string;
    domain: string | null;
  };
  branding: WhiteLabelBranding;
  metrics: WhiteLabelReportMetrics;
  topGaps: WhiteLabelGapSummary[];
  reportDate: string;
  settings: {
    reportFrequency: ReportFrequency;
    emailReports: boolean;
    nextReportAt: string | null;
    lastReportAt: string | null;
  };
};

export type WhiteLabelReportSettingsInput = {
  agencyLogo?: string | null;
  brandColor?: string;
  reportFooterText?: string | null;
  emailReports?: boolean;
  reportFrequency?: ReportFrequency;
};
