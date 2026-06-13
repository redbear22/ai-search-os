"use client";

import type { AuditLayerId } from "@/lib/audit-types";
import { cn } from "@/lib/utils";

export type HeatmapRow = {
  name: string;
  isBrand?: boolean;
  scores: Record<AuditLayerId, number>;
};

const LAYERS: { id: AuditLayerId; label: string }[] = [
  { id: "discoverability", label: "Discoverability" },
  { id: "clarity", label: "Clarity" },
  { id: "authority", label: "Authority" },
  { id: "trust", label: "Trust" },
];

function cellColor(score: number): string {
  if (score >= 80) return "var(--win)";
  if (score >= 60) return "var(--warn, #fbbf24)";
  return "var(--gap)";
}

function cellBg(score: number): string {
  if (score >= 80) return "rgba(63, 209, 139, 0.15)";
  if (score >= 60) return "rgba(251, 191, 36, 0.15)";
  return "rgba(255, 107, 94, 0.15)";
}

export function findAttackOpportunity(
  brandRow: HeatmapRow,
  competitors: HeatmapRow[]
): { competitor: string; layer: AuditLayerId; yourScore: number; theirScore: number } | null {
  let best: {
    competitor: string;
    layer: AuditLayerId;
    gap: number;
    yourScore: number;
    theirScore: number;
  } | null = null;

  for (const comp of competitors) {
    for (const layer of LAYERS) {
      const yours = brandRow.scores[layer.id] ?? 0;
      const theirs = comp.scores[layer.id] ?? 0;
      if (yours > theirs && yours - theirs >= 15) {
        const gap = yours - theirs;
        if (!best || gap > best.gap) {
          best = {
            competitor: comp.name,
            layer: layer.id,
            gap,
            yourScore: yours,
            theirScore: theirs,
          };
        }
      }
    }
  }

  if (!best) return null;
  return {
    competitor: best.competitor,
    layer: best.layer,
    yourScore: best.yourScore,
    theirScore: best.theirScore,
  };
}

type Props = {
  rows: HeatmapRow[];
  className?: string;
};

export function CompetitorHeatmap({ rows, className }: Props) {
  const brandRow = rows.find((r) => r.isBrand) ?? rows[0];
  const competitors = rows.filter((r) => r !== brandRow);
  const attack = brandRow ? findAttackOpportunity(brandRow, competitors) : null;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Run an audit with competitors to see the heatmap.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-x-auto rounded-lg border" style={{ background: "var(--panel)" }}>
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3 font-medium">Brand</th>
              {LAYERS.map((l) => (
                <th key={l.id} className="p-3 font-medium">
                  {l.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className={cn("border-b border-border/50", row.isBrand && "font-medium")}
              >
                <td className="p-3 whitespace-nowrap">
                  {row.name}
                  {row.isBrand && (
                    <span className="ml-2 text-xs text-primary">(you)</span>
                  )}
                </td>
                {LAYERS.map((l) => {
                  const score = row.scores[l.id] ?? 0;
                  return (
                    <td key={l.id} className="p-2">
                      <div
                        className="rounded-md px-2 py-1 text-center font-mono text-xs"
                        style={{
                          background: cellBg(score),
                          color: cellColor(score),
                          border: `1px solid ${cellColor(score)}33`,
                        }}
                      >
                        {score}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {attack && (
        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--ink)", borderColor: "var(--win)" }}
        >
          <p className="text-sm font-medium">Where to attack</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong>{attack.competitor}</strong> is weak in{" "}
            <strong className="capitalize">{attack.layer}</strong> ({attack.theirScore}/100). You
            score {attack.yourScore}/100. This is your best opportunity to leapfrog them.
          </p>
        </div>
      )}
    </div>
  );
}
