import { PLATFORMS } from "@/lib/mock-audit";
import type { AuditData, AuditLayerId } from "@/lib/audit-types";

export interface LayerValidation {
  id: AuditLayerId;
  complete: boolean;
  missing: string[];
}

export function validateDiscoverability(d: AuditData["discoverability"]): LayerValidation {
  const missing: string[] = [];
  if (d.seo.traffic <= 0) missing.push("Monthly traffic");
  if (d.seo.keywords <= 0) missing.push("Ranking keywords");
  if (d.seo.siteHealth <= 0) missing.push("Site health score");
  if (d.aso.aiVisibilityScore <= 0) missing.push("AI visibility score");
  if (d.competitors.length === 0 || !d.competitors.some((c) => c.name.trim())) {
    missing.push("At least one competitor");
  }
  return { id: "discoverability", complete: missing.length === 0, missing };
}

export function validateClarity(c: AuditData["clarity"]): LayerValidation {
  const missing: string[] = [];
  for (const p of PLATFORMS) {
    const data = c.platforms[p.id];
    if (!data?.responseText?.trim()) missing.push(`${p.label} response`);
  }
  return { id: "clarity", complete: missing.length === 0, missing };
}

export function validateAuthority(a: AuditData["authority"]): LayerValidation {
  const missing: string[] = [];
  if (a.backlinksCount <= 0) missing.push("Backlinks count");
  if (a.citedPages <= 0) missing.push("Cited pages");
  if (a.sourcesCitingUs.length === 0) missing.push("At least one source citing us");
  return { id: "authority", complete: missing.length === 0, missing };
}

export function validateTrust(t: AuditData["trust"]): LayerValidation {
  const missing: string[] = [];
  if (t.reviewCount <= 0) missing.push("Review count");
  if (t.averageRating <= 0) missing.push("Average rating");
  return { id: "trust", complete: missing.length === 0, missing };
}

export function validateAllLayers(audit: AuditData): LayerValidation[] {
  return [
    validateDiscoverability(audit.discoverability),
    validateClarity(audit.clarity),
    validateAuthority(audit.authority),
    validateTrust(audit.trust),
  ];
}

export function isAuditComplete(audit: AuditData): boolean {
  return validateAllLayers(audit).every((v) => v.complete);
}
