import type { AuditData, AuditLayerId } from "@/lib/audit-types";
import type { HeatmapRow } from "@/components/CompetitorHeatmap";
import { computePlatformConfidence, CLARITY_PLATFORMS } from "@/lib/clarity-comparison";

type AuditHeatmapInput = AuditData & { auditBrandName: string };

function brandLayerScores(
  state: Pick<AuditData, "discoverability" | "clarity" | "authority" | "trust">
): Record<AuditLayerId, number> {
  const clarityScores = CLARITY_PLATFORMS.map((p) =>
    computePlatformConfidence(state.clarity.platforms[p])
  ).filter((s): s is number => s !== null);
  const clarityAvg =
    clarityScores.length > 0
      ? Math.round(clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length)
      : 50;

  return {
    discoverability: Math.min(
      100,
      Math.round(
        (state.discoverability.seo.siteHealth + state.discoverability.aso.aiVisibilityScore) / 2
      )
    ),
    clarity: clarityAvg,
    authority: Math.min(
      100,
      Math.round(state.authority.citedPages * 8 + state.authority.backlinksCount / 5)
    ),
    trust: Math.round(state.trust.sentimentScore * 100),
  };
}

function competitorLayerScores(aiVisibility: number): Record<AuditLayerId, number> {
  const base = Math.min(100, Math.max(0, aiVisibility));
  return {
    discoverability: base,
    clarity: Math.max(0, base - 8),
    authority: Math.max(0, base - 12),
    trust: Math.max(0, base - 5),
  };
}

export function buildHeatmapFromAudit(state: AuditHeatmapInput): HeatmapRow[] {
  const brandName = state.auditBrandName.trim() || "Your brand";
  const rows: HeatmapRow[] = [
    {
      name: brandName,
      isBrand: true,
      scores: brandLayerScores(state),
    },
  ];

  for (const comp of state.discoverability.competitors) {
    const name = comp.name.trim();
    if (!name) continue;
    rows.push({
      name,
      scores: competitorLayerScores(comp.aiVisibility),
    });
  }

  return rows;
}
