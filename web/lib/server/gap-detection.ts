import "server-only";

import type { AIPlatform, AuditData, AuditLayerId, DiscoverabilityLayer } from "@/lib/audit-types";
import {
  isInventedCompetitorCitationSource,
  isMockClarityResponse,
  isMockTrendMissingItem,
  isPlaceholderCompetitor,
} from "@/lib/audit-gap-heuristics";
import { CLARITY_PLATFORMS, CLARITY_PLATFORM_LABELS } from "@/lib/clarity-comparison";
import type { Gap, GapSeverity } from "@/types/gap";

interface ClarityResponseRow {
  platform: AIPlatform;
  platformLabel: string;
  responseText: string;
  wrongItems: string[];
  missingItems: string[];
}

let gapCounter = 0;

const SEVERITY_SCORES: Record<GapSeverity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

function nextGapId(prefix: string, key: string): string {
  gapCounter += 1;
  const slug = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return `${prefix}_${slug || "item"}_${gapCounter}`;
}

function truncate(text: string, max = 60): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function clarityResponses(auditData: AuditData): ClarityResponseRow[] {
  return CLARITY_PLATFORMS.map((platform) => {
    const row = auditData.clarity.platforms[platform];
    return {
      platform,
      platformLabel: CLARITY_PLATFORM_LABELS[platform] ?? platform,
      responseText: row.responseText,
      wrongItems: row.wrongItems.filter(Boolean),
      missingItems: row.missingItems.filter(Boolean),
    };
  });
}

function deriveKeywordGaps(discoverability: DiscoverabilityLayer): string[] {
  const gaps: string[] = [];
  const { seo, aso, competitors } = discoverability;
  const brandVisibility = aso.aiVisibilityScore;

  for (const competitor of competitors) {
    const name = competitor.name.trim();
    if (!name || isPlaceholderCompetitor(name)) continue;
    if (competitor.aiVisibility > brandVisibility) {
      gaps.push(`${name} alternative`);
    }
    if (competitor.traffic > seo.traffic && seo.traffic > 0) {
      gaps.push(`${name} vs brand traffic gap`);
    }
    if (competitor.brandMentions > aso.brandMentions && aso.brandMentions > 0) {
      gaps.push(`${name} brand mentions`);
    }
  }

  if (seo.keywords > 0 && seo.keywords < 100) {
    gaps.push("core category head terms");
  }

  return [...new Set(gaps)];
}

function pushGap(gaps: Gap[], gap: Omit<Gap, "id" | "severityScore"> & { id?: string }): void {
  gaps.push({
    ...gap,
    id: gap.id ?? nextGapId(gap.layer.slice(0, 4), gap.source),
    severityScore: SEVERITY_SCORES[gap.severity],
  });
}

export function detectGaps(auditData: AuditData): Gap[] {
  const gaps: Gap[] = [];
  gapCounter = 0;

  const { discoverability, clarity, authority, trust } = auditData;
  const keywordGaps = deriveKeywordGaps(discoverability);

  for (const source of authority.sourcesCitingCompetitorsOnly.filter(Boolean)) {
    if (isInventedCompetitorCitationSource(source)) continue;
    pushGap(gaps, {
      layer: "authority",
      title: `Missing citation from ${source}`,
      description: `${source} cites your competitors but does not mention your brand. This is a concrete authority gap.`,
      severity: "critical",
      source,
      suggestedAction: `Reach out to ${source} with a relevant story, data point, or expert quote. Prepare a pitch highlighting your unique value.`,
      suggestedOwner: "PR",
      suggestedTimeline: 4,
    });
  }

  if (authority.backlinksCount > 0 && authority.backlinksCount < 1000) {
    pushGap(gaps, {
      layer: "authority",
      title: "Low authority signal",
      description: `Your backlink profile (${authority.backlinksCount.toLocaleString()} links) is below industry benchmark. This limits AI citation potential.`,
      severity: "high",
      source: "backlinks",
      suggestedAction:
        "Launch a digital PR campaign targeting high-authority publications in your niche. Create linkable assets (original research, tools, data studies).",
      suggestedOwner: "PR",
      suggestedTimeline: 8,
    });
  }

  if (authority.citedPages > 0 && authority.sourcesCitingUs.length === 0) {
    pushGap(gaps, {
      layer: "authority",
      title: "No tracked sources citing your brand",
      description:
        "You report cited pages but no sources are listed as citing your brand. AI systems need visible third-party citations.",
      severity: "high",
      source: "citations",
      suggestedAction:
        "Document existing citations, pursue inclusion in roundup articles, and track new mentions in the authority layer.",
      suggestedOwner: "PR",
      suggestedTimeline: 6,
    });
  }

  const responses = clarityResponses(auditData);
  const hasLiveClarityCapture = responses.some(
    (r) => r.responseText.trim() && !isMockClarityResponse(r.responseText)
  );
  const emptyPlatforms = responses.filter((r) => !r.responseText.trim());

  if (!hasLiveClarityCapture && emptyPlatforms.length > 0) {
    pushGap(gaps, {
      layer: "clarity",
      title: "AI platform responses not captured",
      description:
        "No live AI clarity responses are available yet. Configure platform API keys and run clarity queries to validate how ChatGPT, Perplexity, Claude, and Google AI describe your brand.",
      severity: "low",
      source: "clarity",
      suggestedAction:
        "Open the Clarity layer, query each AI platform with your brand prompt, then mark wrong or missing items.",
      suggestedOwner: "Brand Strategy",
      suggestedTimeline: 1,
    });
  } else {
    for (const response of emptyPlatforms) {
      pushGap(gaps, {
        layer: "clarity",
        title: `No ${response.platformLabel} response captured`,
        description: `${response.platformLabel} has no audit response yet. You cannot validate AI accuracy for this platform.`,
        severity: "medium",
        source: response.platform,
        suggestedAction: `Query ${response.platformLabel} with your brand prompt or paste a recent response, then mark wrong/missing items.`,
        suggestedOwner: "Brand Strategy",
        suggestedTimeline: 1,
      });
    }
  }

  const missingByItem = new Map<string, string[]>();
  for (const response of responses) {
    for (const item of response.wrongItems.filter(Boolean)) {
      pushGap(gaps, {
        layer: "clarity",
        title: `AI misunderstanding: "${truncate(item)}"`,
        description: `${response.platformLabel} incorrectly describes your brand. This confuses potential customers and AI systems.`,
        severity: "critical",
        source: response.platform,
        suggestedAction: `Update your brand's knowledge panel, Wikipedia entry, and structured data. Publish clarifying content about ${item}.`,
        suggestedOwner: "Brand Strategy",
        suggestedTimeline: 3,
      });
    }

    for (const item of response.missingItems.filter(Boolean)) {
      if (isMockTrendMissingItem(item)) continue;
      const key = item.toLowerCase();
      const platforms = missingByItem.get(key) ?? [];
      if (!platforms.includes(response.platformLabel)) {
        platforms.push(response.platformLabel);
        missingByItem.set(key, platforms);
      }
    }
  }

  for (const [item, platformLabels] of missingByItem) {
    const platformText =
      platformLabels.length === 1
        ? platformLabels[0]
        : `${platformLabels.slice(0, -1).join(", ")} and ${platformLabels.at(-1)}`;
    pushGap(gaps, {
      layer: "clarity",
      title: `Missing brand attribute: "${truncate(item)}"`,
      description: `${platformText} do not mention ${item} about your brand.`,
      severity: "medium",
      source: platformLabels.join(", "),
      suggestedAction: `Create content specifically about ${item}. Ensure your website, social profiles, and press releases highlight this attribute.`,
      suggestedOwner: "Content",
      suggestedTimeline: 5,
    });
  }

  const consensus = clarity.comparison?.consensusCorrect ?? [];
  if (consensus.length > 0) {
    const allMissing = new Set(
      clarityResponses(auditData).flatMap((r) => r.missingItems.map((m) => m.toLowerCase()))
    );
    for (const fact of consensus) {
      if (!allMissing.has(fact.toLowerCase())) continue;
      pushGap(gaps, {
        layer: "clarity",
        title: `Consensus fact omitted: "${truncate(fact)}"`,
        description: `Multiple AI platforms agree on "${fact}" but it is still marked missing in your audit.`,
        severity: "high",
        source: "comparison",
        suggestedAction: `Publish definitive content about "${fact}" and reinforce it in structured data and FAQ pages.`,
        suggestedOwner: "Content",
        suggestedTimeline: 4,
      });
    }
  }

  const aiVisibility = discoverability.aso.aiVisibilityScore;
  if (aiVisibility > 0 && aiVisibility < 50) {
    pushGap(gaps, {
      layer: "discoverability",
      title: "Low AI search visibility",
      description: `Your AI visibility score (${aiVisibility}/100) is below average. AI systems are not surfacing your brand.`,
      severity: "high",
      source: "AI visibility",
      suggestedAction:
        "Optimize content for featured snippets, improve site structure, and ensure all pages have proper schema markup. Focus on entity SEO.",
      suggestedOwner: "SEO",
      suggestedTimeline: 6,
    });
  }

  const { seo } = discoverability;
  if (seo.siteHealth > 0 && seo.siteHealth < 70) {
    pushGap(gaps, {
      layer: "discoverability",
      title: "Site health below benchmark",
      description: `Site health score (${seo.siteHealth}/100) may limit crawlability and extractability for AI systems.`,
      severity: "medium",
      source: "site health",
      suggestedAction:
        "Fix critical technical SEO issues: Core Web Vitals, broken links, indexation, and page speed on key landing pages.",
      suggestedOwner: "SEO",
      suggestedTimeline: 4,
    });
  }

  for (const competitor of discoverability.competitors) {
    const name = competitor.name.trim();
    if (!name || isPlaceholderCompetitor(name)) continue;
    if (competitor.aiVisibility > aiVisibility && aiVisibility > 0) {
      pushGap(gaps, {
        layer: "discoverability",
        title: `${name} leads on AI visibility`,
        description: `${name} scores ${competitor.aiVisibility}/100 vs your ${aiVisibility}/100 on AI visibility.`,
        severity: "high",
        source: name,
        suggestedAction: `Analyze ${name}'s entity coverage and citation sources. Close the gap with targeted content and PR.`,
        suggestedOwner: "SEO",
        suggestedTimeline: 6,
      });
    }
  }

  const realCompetitors = discoverability.competitors.filter(
    (c) => c.name.trim() && !isPlaceholderCompetitor(c.name)
  );
  if (realCompetitors.length === 0 && (aiVisibility > 0 || seo.traffic > 0)) {
    pushGap(gaps, {
      layer: "discoverability",
      title: "Add competitors for benchmarking",
      description:
        "No real competitors are configured. Add competitor domains on the audit page to unlock visibility comparisons, keyword gaps, and citation analysis.",
      severity: "low",
      source: "competitors",
      suggestedAction:
        "Enter 2–5 competitor domains in the audit competitors field, then re-run discoverability or the full unified audit.",
      suggestedOwner: "SEO",
      suggestedTimeline: 1,
    });
  }

  for (const kw of keywordGaps.slice(0, 5)) {
    pushGap(gaps, {
      layer: "discoverability",
      title: `Missing keyword: "${kw}"`,
      description: `You don't rank for "${kw}" but competitors do. This represents missed traffic and authority.`,
      severity: "medium",
      source: kw,
      suggestedAction: `Create a comprehensive pillar page targeting "${kw}" and related long-tail variations. Build internal links and pursue backlinks to this content.`,
      suggestedOwner: "SEO",
      suggestedTimeline: 7,
    });
  }

  if (trust.averageRating > 0 && trust.averageRating < 4.0) {
    pushGap(gaps, {
      layer: "trust",
      title: "Below-average customer ratings",
      description: `Your average rating (${trust.averageRating}/5) lags behind competitors. AI systems use this as a trust signal.`,
      severity: "high",
      source: "reviews",
      suggestedAction:
        "Implement a post-purchase review collection campaign. Address negative reviews publicly. Improve product/feature gaps causing low ratings.",
      suggestedOwner: "CX",
      suggestedTimeline: 10,
    });
  }

  if (trust.reviewCount > 0 && trust.reviewCount < 100) {
    pushGap(gaps, {
      layer: "trust",
      title: "Insufficient review volume",
      description: `Only ${trust.reviewCount} reviews available. AI systems need volume to form reliable trust signals.`,
      severity: "medium",
      source: "reviews",
      suggestedAction:
        "Launch a review acquisition campaign: email existing customers, offer incentives, integrate review requests into post-purchase flow.",
      suggestedOwner: "CX",
      suggestedTimeline: 8,
    });
  }

  if (trust.sentimentScore > 0 && trust.sentimentScore < 0.5) {
    pushGap(gaps, {
      layer: "trust",
      title: "Negative sentiment signal",
      description: `Sentiment score (${Math.round(trust.sentimentScore * 100)}%) suggests mixed or negative perception in AI/trust signals.`,
      severity: "high",
      source: "sentiment",
      suggestedAction:
        "Audit negative review themes, publish transparent responses, and reinforce proof points (case studies, certifications) in cornerstone content.",
      suggestedOwner: "CX",
      suggestedTimeline: 8,
    });
  }

  if (trust.hedgedLanguageDetected) {
    pushGap(gaps, {
      layer: "trust",
      title: "AI uses hedging language about your brand",
      description:
        'AI platforms say "some users report..." or "it depends..." instead of confidently recommending your brand.',
      severity: "critical",
      source: "AI trust signals",
      suggestedAction:
        "Build more third-party corroboration: increase review volume, earn more citations from trusted publications, and ensure consistent brand messaging across all platforms.",
      suggestedOwner: "PR",
      suggestedTimeline: 6,
    });
  }

  return gaps;
}

export function scoreDetectedGaps(gaps: Gap[]) {
  const scored = gaps.map((gap) => ({
    ...gap,
    severityScore: gap.severityScore ?? SEVERITY_SCORES[gap.severity],
  }));

  const aggregateSeverity =
    scored.length === 0
      ? 0
      : Math.round(
          scored.reduce((sum, gap) => sum + (gap.severityScore ?? 0), 0) / scored.length
        );

  const priorityScore = scored.reduce((sum, gap) => {
    const weight =
      gap.severity === "critical"
        ? 4
        : gap.severity === "high"
          ? 3
          : gap.severity === "medium"
            ? 2
            : 1;
    return sum + weight * (gap.severityScore ?? 0);
  }, 0);

  return {
    gaps: scored.sort((a, b) => (b.severityScore ?? 0) - (a.severityScore ?? 0)),
    severityScoring: {
      aggregateSeverity,
      priorityScore,
      bySeverity: {
        critical: scored.filter((g) => g.severity === "critical").length,
        high: scored.filter((g) => g.severity === "high").length,
        medium: scored.filter((g) => g.severity === "medium").length,
        low: scored.filter((g) => g.severity === "low").length,
      },
    },
  };
}

export function detectAndScoreGaps(auditData: AuditData) {
  const gaps = detectGaps(auditData);
  return scoreDetectedGaps(gaps);
}
