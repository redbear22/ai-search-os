import { DEMO_AUDIT } from "@/lib/mock-audit";
import { computeClarityAlignment } from "@/store/kpiStore";

const AUDIT_STORAGE_KEY = "ai-search-os-audit-v2";
const KPI_STORAGE_KEY = "kpi-storage";

export function buildDemoAuditStoragePayload() {
  const now = new Date().toISOString();
  return {
    state: {
      discoverability: DEMO_AUDIT.discoverability,
      clarity: DEMO_AUDIT.clarity,
      authority: DEMO_AUDIT.authority,
      trust: DEMO_AUDIT.trust,
      lastSavedAt: now,
      isCompleted: true,
      completedAt: now,
    },
    version: 0,
  };
}

export function buildDemoKpiStoragePayload() {
  const now = new Date().toISOString();
  const alignment = computeClarityAlignment(DEMO_AUDIT);

  return {
    state: {
      kpis: [
        {
          id: "1",
          layerId: "discoverability",
          name: "Brand Mentions",
          currentValue: DEMO_AUDIT.discoverability.aso.brandMentions,
          targetValue: 100,
          unit: "mentions",
          ownerTeam: "SEO",
          ownerPerson: "",
          lastUpdated: now,
        },
        {
          id: "2",
          layerId: "discoverability",
          name: "AI Visibility Score",
          currentValue: DEMO_AUDIT.discoverability.aso.aiVisibilityScore,
          targetValue: 80,
          unit: "%",
          ownerTeam: "SEO",
          ownerPerson: "",
          lastUpdated: now,
        },
        {
          id: "3",
          layerId: "clarity",
          name: "AI Description Alignment",
          currentValue: alignment,
          targetValue: 90,
          unit: "%",
          ownerTeam: "Brand Strategy",
          ownerPerson: "",
          lastUpdated: now,
        },
        {
          id: "4",
          layerId: "authority",
          name: "Unique Cited Sources",
          currentValue: DEMO_AUDIT.authority.sourcesCitingUs.length,
          targetValue: 25,
          unit: "sources",
          ownerTeam: "PR",
          ownerPerson: "",
          lastUpdated: now,
        },
        {
          id: "5",
          layerId: "trust",
          name: "Review Sentiment",
          currentValue: DEMO_AUDIT.trust.averageRating,
          targetValue: 4.5,
          unit: "/5",
          ownerTeam: "Product",
          ownerPerson: "",
          lastUpdated: now,
        },
      ],
      seededAt: now,
      exportedAt: null,
    },
    version: 0,
  };
}

/** Paste the returned string in the browser console on http://127.0.0.1:3000 */
export function getDemoSeedConsoleScript(): string {
  const audit = JSON.stringify(buildDemoAuditStoragePayload());
  const kpis = JSON.stringify(buildDemoKpiStoragePayload());
  return `localStorage.setItem('${AUDIT_STORAGE_KEY}', ${JSON.stringify(audit)});\nlocalStorage.setItem('${KPI_STORAGE_KEY}', ${JSON.stringify(kpis)});\nlocation.reload();`;
}

export function seedDemoToLocalStorage() {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(buildDemoAuditStoragePayload()));
  localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(buildDemoKpiStoragePayload()));
  window.location.reload();
}
