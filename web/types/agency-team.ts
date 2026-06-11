import type { AgencyRole } from "@prisma/client";

export type AgencyTeamClient = {
  id: string;
  name: string;
  domain?: string | null;
};

export type AgencyTeamMember = {
  id: string;
  email: string;
  name: string | null;
  agencyRole: AgencyRole;
  clientId: string | null;
  createdAt: string;
  assignedClients: AgencyTeamClient[];
};

export type AgencyPendingInvite = {
  id: string;
  email: string;
  agencyRole: AgencyRole;
  clientId: string | null;
  clientIds: string | null;
  expiresAt: string;
  createdAt: string;
};

export type AgencyTeamData = {
  members: AgencyTeamMember[];
  pendingInvites: AgencyPendingInvite[];
  clients: { id: string; name: string }[];
  limits: {
    teamMemberLimit: number;
    currentCount: number;
  };
};
