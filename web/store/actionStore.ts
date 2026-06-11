import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuditData, AuditLayerId } from "@/lib/audit-types";
import type { LayerKpi } from "@/store/kpiStore";

export type ActionLayerId = "discoverability" | "clarity" | "authority" | "trust";
export type ActionStatus = "not_started" | "in_progress" | "completed" | "blocked";

export interface Action {
  id: string;
  layerId: ActionLayerId;
  description: string;
  ownerTeam: string;
  ownerPerson: string;
  dueWeek: number;
  resourceAsks: string[];
  status: ActionStatus;
  createdAt: string;
}

export const ACTION_STATUSES: ActionStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
];

export const OWNER_TEAMS = ["SEO", "PR", "Brand Strategy", "Product", "CX", "Content"];

const DEFAULT_ACTIONS: Action[] = [
  {
    id: "1",
    layerId: "discoverability",
    description:
      "Audit top 20 pages for passage-level extractability and update structured data",
    ownerTeam: "SEO",
    ownerPerson: "Alex Chen",
    dueWeek: 4,
    resourceAsks: ["2 dev days"],
    status: "not_started",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    layerId: "authority",
    description:
      "Identify three high-authority publications citing competitors and pitch inclusion",
    ownerTeam: "PR",
    ownerPerson: "Jordan Lee",
    dueWeek: 8,
    resourceAsks: ["PR retainer: $5k"],
    status: "not_started",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    layerId: "clarity",
    description:
      "Run clarity prompt audit across 4 platforms and document wrong/missing answers",
    ownerTeam: "Brand Strategy",
    ownerPerson: "Sam Taylor",
    dueWeek: 2,
    resourceAsks: [],
    status: "in_progress",
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    layerId: "trust",
    description: "Increase G2 review volume from 150 to 250",
    ownerTeam: "CX",
    ownerPerson: "Casey Kim",
    dueWeek: 10,
    resourceAsks: ["Email campaign to customers"],
    status: "not_started",
    createdAt: new Date().toISOString(),
  },
];

function buildActionsFromAudit(
  audit: AuditData,
  kpis: Record<AuditLayerId, LayerKpi>
): Action[] {
  const now = new Date().toISOString();
  const extras: Action[] = [];
  let n = 0;
  const nextId = () => `audit-${Date.now()}-${++n}`;

  if (kpis.discoverability.score < kpis.discoverability.target) {
    extras.push({
      id: nextId(),
      layerId: "discoverability",
      description: `Close AI visibility gap — currently ${audit.discoverability.aso.aiVisibilityScore}, target ${kpis.discoverability.target}`,
      ownerTeam: "SEO",
      ownerPerson: "",
      dueWeek: 4,
      resourceAsks: [],
      status: "not_started",
      createdAt: now,
    });
  }

  const missingTotal = Object.values(audit.clarity.platforms).reduce(
    (sum, p) => sum + p.missingItems.length,
    0
  );
  if (missingTotal > 0) {
    extras.push({
      id: nextId(),
      layerId: "clarity",
      description: `Publish FAQ content for ${missingTotal} missing AI answers across platforms`,
      ownerTeam: "Brand Strategy",
      ownerPerson: "",
      dueWeek: 6,
      resourceAsks: ["Content writer"],
      status: "not_started",
      createdAt: now,
    });
  }

  if (audit.authority.sourcesCitingCompetitorsOnly.length > 0) {
    extras.push({
      id: nextId(),
      layerId: "authority",
      description: `Outreach to ${audit.authority.sourcesCitingCompetitorsOnly.length} competitor-only citation sources`,
      ownerTeam: "PR",
      ownerPerson: "",
      dueWeek: 8,
      resourceAsks: [],
      status: "not_started",
      createdAt: now,
    });
  }

  if (audit.trust.hedgedLanguageDetected) {
    extras.push({
      id: nextId(),
      layerId: "trust",
      description: "Strengthen definitive claims in cornerstone content to reduce hedged AI language",
      ownerTeam: "Content",
      ownerPerson: "",
      dueWeek: 3,
      resourceAsks: [],
      status: "not_started",
      createdAt: now,
    });
  }

  extras.push({
    id: nextId(),
    layerId: "discoverability",
    description: "Re-run 4-layer audit for quarterly benchmark refresh",
    ownerTeam: "SEO",
    ownerPerson: "",
    dueWeek: 12,
    resourceAsks: [],
    status: "not_started",
    createdAt: now,
  });

  return extras;
}

interface ActionStore {
  actions: Action[];
  addAction: (action: Action) => void;
  updateAction: (id: string, updates: Partial<Action>) => void;
  deleteAction: (id: string) => void;
  moveAction: (id: string, newLayerId: ActionLayerId) => void;
  reorderAction: (activeId: string, overId: string) => void;
  seedFromAudit: (audit: AuditData, kpis: Record<AuditLayerId, LayerKpi>) => void;
  resetActions: () => void;
}

export const useActionStore = create<ActionStore>()(
  persist(
    (set) => ({
      actions: DEFAULT_ACTIONS,

      addAction: (action: Action) =>
        set((state) => ({
          actions: [...state.actions, action],
        })),

      updateAction: (id, updates) =>
        set((state) => ({
          actions: state.actions.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteAction: (id) =>
        set((state) => ({ actions: state.actions.filter((a) => a.id !== id) })),

      moveAction: (id, newLayerId) =>
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === id ? { ...a, layerId: newLayerId } : a
          ),
        })),

      reorderAction: (activeId, overId) =>
        set((state) => {
          const actions = [...state.actions];
          const oldIndex = actions.findIndex((a) => a.id === activeId);
          const newIndex = actions.findIndex((a) => a.id === overId);
          if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return state;
          const [removed] = actions.splice(oldIndex, 1);
          actions.splice(newIndex, 0, removed);
          return { actions };
        }),

      seedFromAudit: (audit, kpis) =>
        set((state) => {
          const auditActions = buildActionsFromAudit(audit, kpis);
          const base = state.actions.length === 0 ? DEFAULT_ACTIONS : state.actions;
          const existingDescriptions = new Set(base.map((a) => a.description));
          const merged = [
            ...base,
            ...auditActions.filter((a) => !existingDescriptions.has(a.description)),
          ];
          return { actions: merged };
        }),

      resetActions: () =>
        set({
          actions: DEFAULT_ACTIONS.map((a) => ({
            ...a,
            createdAt: new Date().toISOString(),
          })),
        }),
    }),
    {
      name: "action-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
