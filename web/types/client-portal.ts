export type ClientPortalAgency = {
  name: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  portalName: string | null;
};

export type ClientPortalBranding = ClientPortalAgency & {
  features: {
    showRecommendations: boolean;
    allowClientFeedback: boolean;
    enableChat: boolean;
    brandedEmails: boolean;
  };
};

export type ClientPortalSummary = {
  id: string;
  name: string;
  domain: string | null;
  latestSOV: number;
  gapCount: number;
  completedActions: number;
  improvement: number;
  agency: ClientPortalAgency;
  branding: ClientPortalBranding;
};

export type ClientPortalAudit = {
  id: string;
  date: string;
  discoverability: number;
  clarity: number;
  authority: number;
  trust: number;
};

export type ClientPortalDashboardData = {
  client: ClientPortalSummary;
  audits: ClientPortalAudit[];
};
