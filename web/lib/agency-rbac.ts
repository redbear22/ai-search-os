import type { AgencyRole } from "@prisma/client";

export type AgencyPermission =
  | "billing"
  | "manage_agency"
  | "manage_team"
  | "manage_clients"
  | "run_audits"
  | "generate_fixes"
  | "view_agency_dashboard";

const ROLE_PERMISSIONS: Record<AgencyRole, AgencyPermission[]> = {
  AGENCY_OWNER: [
    "billing",
    "manage_agency",
    "manage_team",
    "manage_clients",
    "run_audits",
    "generate_fixes",
    "view_agency_dashboard",
  ],
  AGENCY_ADMIN: [
    "manage_agency",
    "manage_team",
    "manage_clients",
    "run_audits",
    "generate_fixes",
    "view_agency_dashboard",
  ],
  AGENCY_TEAM: ["run_audits", "generate_fixes", "view_agency_dashboard"],
  CLIENT_VIEWER: [],
};

export const AGENCY_ROLE_LABELS: Record<AgencyRole, string> = {
  AGENCY_OWNER: "Owner",
  AGENCY_ADMIN: "Admin",
  AGENCY_TEAM: "Team",
  CLIENT_VIEWER: "Client Viewer",
};

export const AGENCY_ROLE_DESCRIPTIONS: Record<AgencyRole, string> = {
  AGENCY_OWNER: "Full control including billing and subscription",
  AGENCY_ADMIN: "Manage clients, team members, and agency settings",
  AGENCY_TEAM: "Run audits and generate fixes for assigned clients",
  CLIENT_VIEWER: "Read-only access to the client portal",
};

export const INVITABLE_ROLES: AgencyRole[] = [
  "AGENCY_ADMIN",
  "AGENCY_TEAM",
  "CLIENT_VIEWER",
];

export function hasAgencyPermission(
  role: AgencyRole,
  permission: AgencyPermission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canManageTeam(role: AgencyRole): boolean {
  return hasAgencyPermission(role, "manage_team");
}

export function canManageClients(role: AgencyRole): boolean {
  return hasAgencyPermission(role, "manage_clients");
}

export function requiresClientAssignment(role: AgencyRole): boolean {
  return role === "AGENCY_TEAM";
}
