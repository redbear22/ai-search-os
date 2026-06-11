import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuditData } from "@/lib/audit-types";
import type { Action } from "@/store/actionStore";

export interface Experiment {
  id: string;
  experiment: string;
  outcome: string;
  nextStep: string;
  date: string;
}

export interface KpiSnapshotItem {
  kpiId: string;
  name: string;
  layerId: string;
  currentValue: number;
  targetValue: number;
  unit: string;
}

export interface CheckinVersion {
  id: string;
  versionNumber: number;
  kpiSnapshot: KpiSnapshotItem[];
  auditSnapshot: AuditData;
  actionSnapshot: Action[];
  shareOfVoice: number;
  createdAt: string;
  notes: string;
}

interface CheckinStore {
  experiments: Experiment[];
  versions: CheckinVersion[];
  addExperiment: (experiment: Experiment) => void;
  updateExperiment: (id: string, updates: Partial<Experiment>) => void;
  deleteExperiment: (id: string) => void;
  addVersion: (version: CheckinVersion) => void;
  getLatestVersion: () => CheckinVersion | undefined;
}

export const useCheckinStore = create<CheckinStore>()(
  persist(
    (set, get) => ({
      experiments: [],
      versions: [],

      addExperiment: (experiment) =>
        set((state) => ({
          experiments: [experiment, ...state.experiments],
        })),

      updateExperiment: (id, updates) =>
        set((state) => ({
          experiments: state.experiments.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),

      deleteExperiment: (id) =>
        set((state) => ({
          experiments: state.experiments.filter((e) => e.id !== id),
        })),

      addVersion: (version) =>
        set((state) => ({
          versions: [...state.versions, version],
        })),

      getLatestVersion: () => {
        const { versions } = get();
        return versions[versions.length - 1];
      },
    }),
    {
      name: "checkin-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
