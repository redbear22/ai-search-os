import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface SummaryVersion {
  id: string;
  version: number;
  opportunity: string;
  riskOfInaction: string;
  resourceAskSummary: string;
  createdAt: string;
}

interface SummaryStore {
  versions: SummaryVersion[];
  currentVersionId: string | null;
  addVersion: (version: Omit<SummaryVersion, "id">) => void;
  setCurrentVersion: (id: string) => void;
  deleteVersion: (id: string) => void;
}

export const useSummaryStore = create<SummaryStore>()(
  persist(
    (set) => ({
      versions: [],
      currentVersionId: null,

      addVersion: (version) =>
        set((state) => {
          const newVersion = { ...version, id: Date.now().toString() };
          return {
            versions: [...state.versions, newVersion],
            currentVersionId: newVersion.id,
          };
        }),

      setCurrentVersion: (id) => set({ currentVersionId: id }),

      deleteVersion: (id) =>
        set((state) => {
          const versions = state.versions.filter((v) => v.id !== id);
          const currentVersionId =
            state.currentVersionId === id
              ? versions[versions.length - 1]?.id ?? null
              : state.currentVersionId;
          return { versions, currentVersionId };
        }),
    }),
    {
      name: "summary-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
