export type AgencyDashboardClient = {
  id: string;
  name: string;
  domain: string | null;
  lastAuditDate: string | null;
  settings: {
    shareWithClient: boolean;
    reportFrequency: string;
    clientAccessKey: string | null;
  } | null;
};

export type AgencyDashboardData = {
  agency: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    primaryColor: string;
    teamCount: number;
    totalAudits: number;
    subscription: {
      plan: string;
      clientLimit: number;
      teamMemberLimit: number;
    } | null;
  } | null;
  clients: AgencyDashboardClient[];
};
