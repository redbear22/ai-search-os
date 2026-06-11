import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { PLATFORMS } from "@/lib/mock-audit";
import type { AuditData, AuditLayerId } from "@/lib/audit-types";

export interface KPI {
  id: string;
  layerId: "discoverability" | "clarity" | "authority" | "trust";
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  ownerTeam: string;
  ownerPerson: string;
  lastUpdated: string;
}

export const OWNER_TEAMS = ["SEO", "PR", "Brand", "Brand Strategy", "Product", "CX", "Content"] as const;

const DEFAULT_KPIS: KPI[] = [
  {
    id: "1",
    layerId: "discoverability",
    name: "Brand Mentions",
    currentValue: 0,
    targetValue: 100,
    unit: "mentions",
    ownerTeam: "SEO",
    ownerPerson: "",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "2",
    layerId: "discoverability",
    name: "AI Visibility Score",
    currentValue: 0,
    targetValue: 80,
    unit: "%",
    ownerTeam: "SEO",
    ownerPerson: "",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "3",
    layerId: "clarity",
    name: "AI Description Alignment",
    currentValue: 0,
    targetValue: 90,
    unit: "%",
    ownerTeam: "Brand Strategy",
    ownerPerson: "",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "4",
    layerId: "authority",
    name: "Unique Cited Sources",
    currentValue: 0,
    targetValue: 25,
    unit: "sources",
    ownerTeam: "PR",
    ownerPerson: "",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "5",
    layerId: "trust",
    name: "Review Sentiment",
    currentValue: 0,
    targetValue: 4.5,
    unit: "/5",
    ownerTeam: "Product",
    ownerPerson: "",
    lastUpdated: new Date().toISOString(),
  },
];

/** @deprecated — used by actionStore seeding */
export interface LayerKpi {
  layer: AuditLayerId;
  score: number;
  label: string;
  notes: string;
  target: number;
}

export function computeClarityAlignment(audit: AuditData): number {
  let points = 0;
  let max = 0;
  for (const p of PLATFORMS) {
    const plat = audit.clarity.platforms[p.id];
    if (!plat) continue;
    const total =
      plat.correctItems.length + plat.wrongItems.length + plat.missingItems.length;
    max += Math.max(total, 1);
    points += plat.correctItems.length;
    if (plat.responseText.trim()) points += 1;
  }
  return max ? Math.round((points / (max + PLATFORMS.length)) * 100) : 0;
}

export function kpiProgress(kpi: KPI): number {
  if (kpi.targetValue <= 0) return 0;
  return Math.min(100, Math.round((kpi.currentValue / kpi.targetValue) * 100));
}

export function kpisToLegacySummary(kpis: KPI[]): Record<AuditLayerId, LayerKpi> {
  const layers: AuditLayerId[] = ["discoverability", "clarity", "authority", "trust"];
  const labels: Record<AuditLayerId, string> = {
    discoverability: "Discoverability",
    clarity: "Clarity",
    authority: "Authority",
    trust: "Trust",
  };
  const out = {} as Record<AuditLayerId, LayerKpi>;
  for (const layer of layers) {
    const layerKpis = kpis.filter((k) => k.layerId === layer);
    const score = layerKpis.length
      ? Math.round(layerKpis.reduce((n, k) => n + kpiProgress(k), 0) / layerKpis.length)
      : 0;
    out[layer] = {
      layer,
      label: labels[layer],
      score,
      target: layerKpis.length
        ? Math.round(layerKpis.reduce((n, k) => n + k.targetValue, 0) / layerKpis.length)
        : 0,
      notes: layerKpis.map((k) => `${k.name}: ${k.currentValue}`).join(" · "),
    };
  }
  return out;
}

function kpisFromAudit(audit: AuditData): KPI[] {
  const now = new Date().toISOString();
  const base = DEFAULT_KPIS.map((k) => ({ ...k, lastUpdated: now }));

  return base.map((kpi) => {
    switch (kpi.id) {
      case "1":
        return { ...kpi, currentValue: audit.discoverability.aso.brandMentions };
      case "2":
        return { ...kpi, currentValue: audit.discoverability.aso.aiVisibilityScore };
      case "3":
        return { ...kpi, currentValue: computeClarityAlignment(audit) };
      case "4":
        return { ...kpi, currentValue: audit.authority.sourcesCitingUs.length };
      case "5":
        return { ...kpi, currentValue: audit.trust.averageRating };
      default:
        return kpi;
    }
  });
}

interface KPIStore {
  kpis: KPI[];
  seededAt: string | null;
  exportedAt: string | null;
  setKPIs: (kpis: KPI[]) => void;
  updateKPI: (id: string, updates: Partial<KPI>) => void;
  addKPI: (kpi: KPI) => void;
  deleteKPI: (id: string) => void;
  seedFromAudit: (audit: AuditData) => void;
  exportToExecutiveSummary: () => void;
  resetKpis: () => void;
}

export const useKPIStore = create<KPIStore>()(
  persist(
    (set) => ({
      kpis: DEFAULT_KPIS,
      seededAt: null,
      exportedAt: null,

      setKPIs: (kpis) => set({ kpis }),

      updateKPI: (id, updates) =>
        set((state) => ({
          kpis: state.kpis.map((kpi) =>
            kpi.id === id
              ? { ...kpi, ...updates, lastUpdated: new Date().toISOString() }
              : kpi
          ),
        })),

      addKPI: (kpi) => set((state) => ({ kpis: [...state.kpis, kpi] })),

      deleteKPI: (id) =>
        set((state) => ({ kpis: state.kpis.filter((kpi) => kpi.id !== id) })),

      seedFromAudit: (audit) =>
        set({
          kpis: kpisFromAudit(audit),
          seededAt: new Date().toISOString(),
        }),

      exportToExecutiveSummary: () =>
        set({ exportedAt: new Date().toISOString() }),

      resetKpis: () =>
        set({
          kpis: DEFAULT_KPIS.map((k) => ({
            ...k,
            lastUpdated: new Date().toISOString(),
          })),
          seededAt: null,
          exportedAt: null,
        }),
    }),
    {
      name: "kpi-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        kpis: s.kpis,
        seededAt: s.seededAt,
        exportedAt: s.exportedAt,
      }),
    }
  )
);

/** Backward-compatible alias */
export const useKpiStore = useKPIStore;
