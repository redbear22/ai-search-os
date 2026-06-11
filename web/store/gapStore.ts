import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ResolvedGap {
  gapId: string;
  actionId: string;
  resolvedAt: string;
}

interface GapStore {
  resolvedGaps: ResolvedGap[];
  markResolved: (gapId: string, actionId: string) => void;
  isResolved: (gapId: string) => boolean;
}

export const useGapStore = create<GapStore>()(
  persist(
    (set, get) => ({
      resolvedGaps: [],

      markResolved: (gapId, actionId) =>
        set((state) => {
          if (state.resolvedGaps.some((g) => g.gapId === gapId)) {
            return state;
          }
          return {
            resolvedGaps: [
              ...state.resolvedGaps,
              { gapId, actionId, resolvedAt: new Date().toISOString() },
            ],
          };
        }),

      isResolved: (gapId) => get().resolvedGaps.some((g) => g.gapId === gapId),
    }),
    {
      name: "gap-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
