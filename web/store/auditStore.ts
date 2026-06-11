import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isAuditComplete } from "@/lib/audit-validation";
import {
  DEMO_AUDIT,
  EMPTY_AUDIT,
  EMPTY_PLATFORM_CLARITY,
  MOCK_AUDIT,
  normalizeClarityLayer,
} from "@/lib/mock-audit";
import { comparePlatformResponses } from "@/lib/clarity-response-compare";
import { CLARITY_PLATFORMS } from "@/lib/clarity-comparison";
import type {
  AIPlatform,
  AuditData,
  AuthorityLayer,
  DiscoverabilityLayer,
  TrustLayer,
} from "@/lib/audit-types";

interface AuditStore extends AuditData {
  isHydrated: boolean;
  lastSavedAt: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  auditBrandName: string;
  auditDomain: string;

  setHydrated: () => void;
  applyUnifiedAudit: (data: AuditData, brandName: string, domain: string) => void;
  saveProgress: () => void;
  completeAudit: () => boolean;
  loadSavedOrEmpty: () => void;
  resetToMock: () => void;
  resetToDemo: () => void;
  resetToEmpty: () => void;

  setDiscoverability: (data: Partial<DiscoverabilityLayer>) => void;
  setSeo: (data: Partial<DiscoverabilityLayer["seo"]>) => void;
  setAso: (data: Partial<DiscoverabilityLayer["aso"]>) => void;
  setCompetitors: (competitors: DiscoverabilityLayer["competitors"]) => void;
  updateCompetitor: (index: number, data: Partial<DiscoverabilityLayer["competitors"][0]>) => void;
  addCompetitor: () => void;
  removeCompetitor: (index: number) => void;
  setPlatformClarity: (
    platform: AIPlatform,
    data: Partial<AuditData["clarity"]["platforms"][AIPlatform]>
  ) => void;
  setPlatformArray: (
    platform: AIPlatform,
    field: "correctItems" | "wrongItems" | "missingItems",
    items: string[]
  ) => void;
  setAuthority: (data: Partial<AuthorityLayer>) => void;
  setAuthorityArray: (
    field: "sourcesCitingUs" | "sourcesCitingCompetitorsOnly",
    items: string[]
  ) => void;
  setTrust: (data: Partial<TrustLayer>) => void;
  runClarityComparison: () => boolean;
  setPlatformResponses: (updates: Partial<Record<AIPlatform, string>>) => void;
}

const auditActions = (
  set: (
    partial:
      | Partial<AuditStore>
      | ((state: AuditStore) => Partial<AuditStore>)
  ) => void
) => ({
  setDiscoverability: (data: Partial<DiscoverabilityLayer>) =>
    set((s) => ({ discoverability: { ...s.discoverability, ...data } })),

  setSeo: (data: Partial<DiscoverabilityLayer["seo"]>) =>
    set((s) => ({
      discoverability: { ...s.discoverability, seo: { ...s.discoverability.seo, ...data } },
    })),

  setAso: (data: Partial<DiscoverabilityLayer["aso"]>) =>
    set((s) => ({
      discoverability: { ...s.discoverability, aso: { ...s.discoverability.aso, ...data } },
    })),

  setCompetitors: (competitors: DiscoverabilityLayer["competitors"]) =>
    set((s) => ({ discoverability: { ...s.discoverability, competitors } })),

  updateCompetitor: (index: number, data: Partial<DiscoverabilityLayer["competitors"][0]>) =>
    set((s) => {
      const competitors = [...s.discoverability.competitors];
      competitors[index] = { ...competitors[index], ...data };
      return { discoverability: { ...s.discoverability, competitors } };
    }),

  addCompetitor: () =>
    set((s) => ({
      discoverability: {
        ...s.discoverability,
        competitors: [
          ...s.discoverability.competitors,
          { name: "", traffic: 0, aiVisibility: 0, brandMentions: 0 },
        ],
      },
    })),

  removeCompetitor: (index: number) =>
    set((s) => ({
      discoverability: {
        ...s.discoverability,
        competitors: s.discoverability.competitors.filter((_, i) => i !== index),
      },
    })),

  setPlatformClarity: (
    platform: AIPlatform,
    data: Partial<AuditData["clarity"]["platforms"][AIPlatform]>
  ) =>
    set((s) => ({
      clarity: {
        ...s.clarity,
        platforms: {
          ...s.clarity.platforms,
          [platform]: {
            ...EMPTY_PLATFORM_CLARITY,
            ...s.clarity.platforms[platform],
            ...data,
          },
        },
      },
    })),

  setPlatformArray: (
    platform: AIPlatform,
    field: "correctItems" | "wrongItems" | "missingItems",
    items: string[]
  ) =>
    set((s) => ({
      clarity: {
        ...s.clarity,
        platforms: {
          ...s.clarity.platforms,
          [platform]: {
            ...EMPTY_PLATFORM_CLARITY,
            ...s.clarity.platforms[platform],
            [field]: items,
          },
        },
      },
    })),

  setAuthority: (data: Partial<AuthorityLayer>) =>
    set((s) => ({ authority: { ...s.authority, ...data } })),

  setAuthorityArray: (
    field: "sourcesCitingUs" | "sourcesCitingCompetitorsOnly",
    items: string[]
  ) =>
    set((s) => ({ authority: { ...s.authority, [field]: items } })),

  setTrust: (data: Partial<TrustLayer>) =>
    set((s) => ({ trust: { ...s.trust, ...data } })),
});

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      ...EMPTY_AUDIT,
      isHydrated: false,
      lastSavedAt: null,
      isCompleted: false,
      completedAt: null,
      auditBrandName: "",
      auditDomain: "",

      setHydrated: () => set({ isHydrated: true }),

      applyUnifiedAudit: (data, brandName, domain) =>
        set({
          discoverability: data.discoverability,
          clarity: normalizeClarityLayer(data.clarity),
          authority: data.authority,
          trust: data.trust,
          auditBrandName: brandName,
          auditDomain: domain,
          isCompleted: false,
          completedAt: null,
          lastSavedAt: new Date().toISOString(),
        }),

      saveProgress: () => set({ lastSavedAt: new Date().toISOString() }),

      completeAudit: () => {
        const state = get();
        if (!isAuditComplete(state)) return false;
        const now = new Date().toISOString();
        set({ isCompleted: true, completedAt: now, lastSavedAt: now });
        return true;
      },

      loadSavedOrEmpty: () => {
        // Persist rehydrates automatically; mark hydrated when done
        set({ isHydrated: true });
      },

      resetToMock: () =>
        set({
          ...MOCK_AUDIT,
          isCompleted: false,
          completedAt: null,
          lastSavedAt: new Date().toISOString(),
        }),

      resetToDemo: () =>
        set({
          ...DEMO_AUDIT,
          isCompleted: true,
          completedAt: new Date().toISOString(),
          lastSavedAt: new Date().toISOString(),
        }),

      resetToEmpty: () =>
        set({
          ...EMPTY_AUDIT,
          isCompleted: false,
          completedAt: null,
          lastSavedAt: null,
        }),

      setPlatformResponses: (updates) =>
        set((s) => {
          const platforms = { ...s.clarity.platforms };
          for (const p of CLARITY_PLATFORMS) {
            const text = updates[p]?.trim();
            if (!text) continue;
            platforms[p] = {
              ...EMPTY_PLATFORM_CLARITY,
              ...platforms[p],
              responseText: text,
            };
          }
          return { clarity: { ...s.clarity, platforms } };
        }),

      runClarityComparison: () => {
        const state = get();
        const responses = {} as Partial<Record<AIPlatform, string>>;
        for (const p of CLARITY_PLATFORMS) {
          const text = state.clarity.platforms[p]?.responseText?.trim();
          if (text) responses[p] = text;
        }

        const result = comparePlatformResponses(responses);
        if (!result) return false;

        set((s) => {
          const platforms = { ...s.clarity.platforms };
          for (const p of CLARITY_PLATFORMS) {
            const row = result.platforms[p];
            platforms[p] = {
              ...EMPTY_PLATFORM_CLARITY,
              ...platforms[p],
              correctItems: row.correctItems,
              wrongItems: row.wrongItems,
              missingItems: row.missingItems,
            };
          }
          return {
            clarity: {
              platforms,
              comparison: {
                analyzedAt: result.analyzedAt,
                consensusCorrect: result.consensusCorrect,
              },
            },
            lastSavedAt: new Date().toISOString(),
          };
        });
        return true;
      },

      ...auditActions(set),
    }),
    {
      name: "ai-search-os-audit-v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        discoverability: state.discoverability,
        clarity: state.clarity,
        authority: state.authority,
        trust: state.trust,
        auditBrandName: state.auditBrandName,
        auditDomain: state.auditDomain,
        lastSavedAt: state.lastSavedAt,
        isCompleted: state.isCompleted,
        completedAt: state.completedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.clarity) {
          state.clarity = normalizeClarityLayer(state.clarity);
        }
        state?.setHydrated();
      },
    }
  )
);
