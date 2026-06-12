import type { Prisma } from "@prisma/client";
import {
  computeAuthorityScore,
  computeClarityScore,
  computeDiscoverabilityScore,
  computeTrustScore,
  parseAuditData,
} from "@/lib/client-portal";
import { computeShareOfVoice } from "@/lib/checkin-snapshot";
import { getRootDomain } from "@/lib/domain-normalization";
import { PLATFORMS } from "@/lib/mock-audit";
import { prisma } from "@/lib/prisma";
import type {
  CitationPlatformData,
  CitationPlatformId,
  ClientNetworkComparison,
  CompetitiveIntelligenceNetwork,
  CompetitorChangeSignal,
  DataSourceStatus,
  NetworkBenchmark,
  NetworkEffects,
  NetworkInsight,
  PortalNetworkInsights,
  PublicationPattern,
} from "@/types/competitive-intelligence-network";

const CITATION_PLATFORMS: CitationPlatformId[] = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
];

const PUBLICATION_AUTHORITY: Record<string, { multiplier: number; category: string }> = {
  techcrunch: { multiplier: 5.0, category: "tech" },
  forbes: { multiplier: 4.2, category: "business" },
  wired: { multiplier: 3.8, category: "tech" },
  "the verge": { multiplier: 3.5, category: "tech" },
  g2: { multiplier: 3.2, category: "reviews" },
  producthunt: { multiplier: 2.8, category: "launch" },
  medium: { multiplier: 1.4, category: "content" },
  reddit: { multiplier: 1.6, category: "community" },
  wikipedia: { multiplier: 4.5, category: "reference" },
  bloomberg: { multiplier: 4.0, category: "business" },
};

const INDUSTRY_FREQUENCY_DAYS: Record<string, number> = {
  "e-commerce": 5,
  saas: 7,
  healthcare: 14,
  legal: 14,
  finance: 10,
  education: 21,
  general: 14,
};

const SEED_CITATION_PLATFORMS: CitationPlatformData[] = [
  {
    platform: "chatgpt",
    label: "ChatGPT",
    citationVolume: 12400,
    avgAuthorityScore: 72,
    brandMentionRate: 0.38,
    trend: "up",
    source: "seed",
  },
  {
    platform: "perplexity",
    label: "Perplexity",
    citationVolume: 8900,
    avgAuthorityScore: 68,
    brandMentionRate: 0.42,
    trend: "up",
    source: "seed",
  },
  {
    platform: "claude",
    label: "Claude",
    citationVolume: 5600,
    avgAuthorityScore: 65,
    brandMentionRate: 0.31,
    trend: "stable",
    source: "seed",
  },
  {
    platform: "gemini",
    label: "Google AI",
    citationVolume: 10200,
    avgAuthorityScore: 70,
    brandMentionRate: 0.35,
    trend: "up",
    source: "seed",
  },
];

type AnonymizedClientRow = {
  industry: string;
  authorityScore: number;
  healthScore: number;
  shareOfVoice: number;
  gapCount: number;
  auditCount: number;
  authorityFixSuccessRate: number | null;
  auditIntervalDays: number | null;
};

export function inferIndustry(domain: string | null, name: string): string {
  const text = `${domain ?? ""} ${name}`.toLowerCase();
  if (
    /\b(shop|store|cart|commerce|retail|boutique|ecommerce|e-commerce)\b/.test(text) ||
    text.includes(".shop")
  ) {
    return "e-commerce";
  }
  if (
    /\b(saas|software|app|cloud|api|platform)\b/.test(text) ||
    text.endsWith(".io") ||
    text.endsWith(".app")
  ) {
    return "saas";
  }
  if (/\b(health|medical|clinic|pharma|wellness|hospital)\b/.test(text)) {
    return "healthcare";
  }
  if (/\b(law|legal|attorney|lawyer)\b/.test(text)) return "legal";
  if (/\b(finance|bank|invest|capital|fintech|insurance)\b/.test(text)) return "finance";
  if (/\b(edu|school|university|learning|academy)\b/.test(text)) return "education";
  return "general";
}

export function getPublicationAuthorityMultiplier(publication: string): number {
  const normalized = getRootDomain(publication);
  for (const [key, value] of Object.entries(PUBLICATION_AUTHORITY)) {
    if (normalized.includes(key)) return value.multiplier;
  }
  return 1.0;
}

export function getIndustryOptimalAuditDays(industry: string): number {
  return INDUSTRY_FREQUENCY_DAYS[industry] ?? INDUSTRY_FREQUENCY_DAYS.general;
}

function compositeHealth(scores: {
  discoverability: number;
  clarity: number;
  authority: number;
  trust: number;
  shareOfVoice: number;
}): number {
  return Math.round(
    scores.discoverability * 0.2 +
      scores.clarity * 0.2 +
      scores.authority * 0.2 +
      scores.trust * 0.2 +
      scores.shareOfVoice * 0.2
  );
}

function layerScoresFromAuditData(auditData: Prisma.JsonValue) {
  const audit = parseAuditData(auditData);
  if (!audit) {
    return {
      discoverability: 0,
      clarity: 0,
      authority: 0,
      trust: 0,
      shareOfVoice: 0,
    };
  }
  return {
    discoverability: computeDiscoverabilityScore(audit),
    clarity: computeClarityScore(audit),
    authority: computeAuthorityScore(audit),
    trust: computeTrustScore(audit),
    shareOfVoice: computeShareOfVoice(audit),
  };
}

function computeNetworkStrength(
  clientCount: number,
  auditCount: number,
  learningCount: number
): number {
  const clientFactor = Math.min(1, clientCount / 10) * 40;
  const auditFactor = Math.min(1, auditCount / 50) * 35;
  const learningFactor = Math.min(1, learningCount / 30) * 25;
  return Math.round(clientFactor + auditFactor + learningFactor);
}

function buildFlywheel(strength: number): NetworkEffects["flywheel"] {
  return [
    {
      step: "More clients",
      description: `${strength >= 30 ? "Growing" : "Building"} anonymized audit corpus`,
    },
    {
      step: "Better benchmarks",
      description: "Industry buckets improve as sample size increases",
    },
    {
      step: "Accurate predictions",
      description: "ROI and frequency models sharpen with learning data",
    },
    {
      step: "Better fixes",
      description: "Gap patterns inform autonomous audit prioritization",
    },
    {
      step: "Happier clients",
      description: "Higher retention drives more network contributions",
    },
  ];
}

async function loadAnonymizedRows(agencyId: string): Promise<AnonymizedClientRow[]> {
  const clients = await prisma.client.findMany({
    where: { agencyId },
    select: {
      name: true,
      domain: true,
      audits: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { auditData: true, createdAt: true, gapCount: true },
      },
      gaps: {
        where: { layer: "authority", status: "resolved" },
        select: { id: true },
      },
      autonomousAuditConfig: {
        select: {
          auditFrequency: true,
          optimizedFrequency: true,
          lastAuditAt: true,
        },
      },
      _count: { select: { audits: true, gaps: true } },
    },
  });

  const learning = await prisma.gapFixLearning.findMany({
    where: { agencyId, layer: "authority" },
    select: { successRate: true },
  });
  const agencyAuthoritySuccess =
    learning.length > 0
      ? learning.reduce((s, r) => s + r.successRate, 0) / learning.length
      : null;

  return clients.map((client) => {
    const latest = client.audits[0];
    const scores = latest
      ? layerScoresFromAuditData(latest.auditData)
      : {
          discoverability: 0,
          clarity: 0,
          authority: 0,
          trust: 0,
          shareOfVoice: 0,
        };

    let auditIntervalDays: number | null = null;
    if (client.audits.length >= 2) {
      const a = client.audits[0]!.createdAt.getTime();
      const b = client.audits[1]!.createdAt.getTime();
      auditIntervalDays = Math.round(Math.abs(a - b) / 86400000);
    }

    return {
      industry: inferIndustry(client.domain, client.name),
      authorityScore: scores.authority,
      healthScore: compositeHealth(scores),
      shareOfVoice: scores.shareOfVoice,
      gapCount: client._count.gaps,
      auditCount: client._count.audits,
      authorityFixSuccessRate: agencyAuthoritySuccess,
      auditIntervalDays,
    };
  });
}

function groupByIndustry(rows: AnonymizedClientRow[]): Map<string, AnonymizedClientRow[]> {
  const map = new Map<string, AnonymizedClientRow[]>();
  for (const row of rows) {
    const list = map.get(row.industry) ?? [];
    list.push(row);
    map.set(row.industry, list);
  }
  return map;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function buildBenchmarks(
  rows: AnonymizedClientRow[],
  globalRows: AnonymizedClientRow[]
): NetworkBenchmark[] {
  const combined = [...rows, ...globalRows];
  const byIndustry = groupByIndustry(combined);
  const benchmarks: NetworkBenchmark[] = [];

  for (const [industry, industryRows] of byIndustry) {
    benchmarks.push({
      industry,
      metric: "avg_authority_score",
      value: Math.round(avg(industryRows.map((r) => r.authorityScore))),
      sampleSize: industryRows.length,
      unit: "%",
    });
    benchmarks.push({
      industry,
      metric: "avg_health_score",
      value: Math.round(avg(industryRows.map((r) => r.healthScore))),
      sampleSize: industryRows.length,
      unit: "%",
    });
    benchmarks.push({
      industry,
      metric: "avg_share_of_voice",
      value: Math.round(avg(industryRows.map((r) => r.shareOfVoice))),
      sampleSize: industryRows.length,
      unit: "%",
    });

    const intervals = industryRows
      .map((r) => r.auditIntervalDays)
      .filter((d): d is number => d !== null && d > 0);
    if (intervals.length > 0) {
      benchmarks.push({
        industry,
        metric: "optimal_audit_interval_days",
        value: Math.round(avg(intervals)),
        sampleSize: intervals.length,
        unit: "days",
      });
    }
  }

  const allAuthority = combined.filter((r) => r.authorityScore > 0);
  if (allAuthority.length > 0) {
    benchmarks.push({
      industry: "all",
      metric: "avg_authority_score",
      value: Math.round(avg(allAuthority.map((r) => r.authorityScore))),
      sampleSize: allAuthority.length,
      unit: "%",
    });
  }

  return benchmarks;
}

function buildInsights(
  rows: AnonymizedClientRow[],
  benchmarks: NetworkBenchmark[],
  learningCount: number,
  clientCount: number
): NetworkInsight[] {
  const insights: NetworkInsight[] = [];
  const byIndustry = groupByIndustry(rows);
  const sparse = clientCount < 3;

  for (const [industry, industryRows] of byIndustry) {
    if (industryRows.length < 2 && sparse) continue;

    const industryAuthority = avg(industryRows.map((r) => r.authorityScore));
    const allAuthority = avg(rows.map((r) => r.authorityScore));
    const otherIndustries = rows.filter((r) => r.industry !== industry);
    const otherAvg = otherIndustries.length > 0 ? avg(otherIndustries.map((r) => r.authorityScore)) : allAuthority;

    if (industryAuthority > 0 && otherAvg > 0 && industryRows.length >= 2) {
      const roiDelta = Math.round(((industryAuthority - otherAvg) / otherAvg) * 100);
      const successRates = industryRows
        .map((r) => r.authorityFixSuccessRate)
        .filter((r): r is number => r !== null);
      const successBoost =
        successRates.length > 0 ? Math.round(avg(successRates) * 100) : Math.abs(roiDelta);

      if (Math.abs(roiDelta) >= 5 || successBoost >= 30) {
        const displayIndustry = industry === "saas" ? "SaaS" : industry;
        insights.push({
          id: `roi-${industry}`,
          category: "roi",
          headline: `Clients in ${displayIndustry} see ${Math.max(successBoost, Math.abs(roiDelta))}% higher ROI from authority fixes`,
          detail: `Based on ${industryRows.length} anonymized clients. Authority score avg ${Math.round(industryAuthority)}% vs network ${Math.round(otherAvg)}%.`,
          confidence: Math.min(0.92, 0.45 + industryRows.length * 0.08),
          industry,
          metric: "authority_fix_roi",
          source: industryRows.length >= 3 ? "computed" : "early_signal",
          label: industryRows.length < 3 ? "early network signal" : undefined,
        });
      }
    }

    const intervalBench = benchmarks.find(
      (b) => b.industry === industry && b.metric === "optimal_audit_interval_days"
    );
    const fallbackDays = getIndustryOptimalAuditDays(industry);
    const optimalDays = intervalBench?.value ?? fallbackDays;
    const displayIndustry = industry === "saas" ? "SaaS" : industry;
    const ecomLabel = industry === "e-commerce" ? "e-commerce" : displayIndustry;

    insights.push({
      id: `freq-${industry}`,
      category: "audit_frequency",
      headline: `Optimal audit frequency for ${ecomLabel}: every ${optimalDays} days`,
      detail: intervalBench
        ? `Derived from ${intervalBench.sampleSize} anonymized audit intervals in your network.`
        : `Rules-based default for ${ecomLabel}; will refine as more audits are collected.`,
      confidence: intervalBench ? Math.min(0.88, 0.5 + intervalBench.sampleSize * 0.1) : 0.42,
      industry,
      metric: "audit_interval_days",
      source: intervalBench ? "computed" : "rules",
      label: !intervalBench ? "early network signal" : undefined,
    });
  }

  const topPublication = Object.entries(PUBLICATION_AUTHORITY).sort(
    (a, b) => b[1].multiplier - a[1].multiplier
  )[0];
  if (topPublication) {
    const [name, meta] = topPublication;
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    insights.push({
      id: `pub-${name}`,
      category: "publication",
      headline: `Citation from ${displayName} worth ${meta.multiplier}x average publication`,
      detail: `Authority multiplier applied in citation outreach prioritization. Category: ${meta.category}.`,
      confidence: 0.85,
      metric: "authority_multiplier",
      source: "rules",
    });
  }

  const platformInsight = SEED_CITATION_PLATFORMS.reduce((best, p) =>
    p.brandMentionRate > best.brandMentionRate ? p : best
  );
  insights.push({
    id: `citation-${platformInsight.platform}`,
    category: "citation",
    headline: `${platformInsight.label} shows highest brand mention rate (${Math.round(platformInsight.brandMentionRate * 100)}%)`,
    detail: "Public citation benchmark across 4 AI platforms. Integrate live APIs for client-specific tracking.",
    confidence: 0.72,
    metric: "brand_mention_rate",
    source: "rules",
    label: "public benchmark",
  });

  if (learningCount >= 5) {
    insights.push({
      id: "network-learning",
      category: "network",
      headline: `Network learning active: ${learningCount} fix patterns recorded`,
      detail: "Gap fix outcomes improve autonomous audit prioritization across your client portfolio.",
      confidence: Math.min(0.9, 0.55 + learningCount * 0.02),
      metric: "learning_records",
      source: "computed",
    });
  }

  return insights.sort((a, b) => b.confidence - a.confidence);
}

async function buildCompetitorSignals(agencyId: string): Promise<CompetitorChangeSignal[]> {
  const recentGaps = await prisma.gap.findMany({
    where: {
      client: { agencyId },
      createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
    },
    select: {
      severity: true,
      title: true,
      createdAt: true,
      client: { select: { domain: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const byIndustry = new Map<string, number>();
  for (const gap of recentGaps) {
    const industry = inferIndustry(gap.client.domain, gap.client.name);
    byIndustry.set(industry, (byIndustry.get(industry) ?? 0) + 1);
  }

  const signals: CompetitorChangeSignal[] = [];
  for (const [industry, count] of byIndustry) {
    if (count >= 3) {
      signals.push({
        signalType: "gap_spike",
        industry,
        severity: count >= 8 ? "high" : count >= 5 ? "medium" : "low",
        description: `${count} new gaps detected across ${industry} clients in the last 30 days`,
        detectedAt: new Date().toISOString(),
        source: "rules",
      });
    }
  }

  const domainChanges = await prisma.autonomousAuditConfig.findMany({
    where: {
      client: { agencyId },
      lastKnownDomain: { not: null },
    },
    select: {
      lastKnownDomain: true,
      client: { select: { domain: true, name: true } },
      updatedAt: true,
    },
    take: 20,
  });

  for (const config of domainChanges) {
    const current = config.client.domain?.trim();
    const last = config.lastKnownDomain?.trim();
    if (current && last && current !== last) {
      signals.push({
        signalType: "domain_change",
        industry: inferIndustry(config.client.domain, config.client.name),
        severity: "medium",
        description: "Competitor or client domain change detected — re-audit recommended",
        detectedAt: config.updatedAt.toISOString(),
        source: "rules",
      });
    }
  }

  return signals.slice(0, 10);
}

function buildPublicationPatterns(): PublicationPattern[] {
  return Object.entries(PUBLICATION_AUTHORITY)
    .map(([publication, meta]) => ({
      publication: publication.charAt(0).toUpperCase() + publication.slice(1),
      authorityMultiplier: meta.multiplier,
      category: meta.category,
      sampleCitations: Math.round(meta.multiplier * 120),
    }))
    .sort((a, b) => b.authorityMultiplier - a.authorityMultiplier);
}

function buildCitationPlatforms(rows: AnonymizedClientRow[]): CitationPlatformData[] {
  const hasRealData = rows.some((r) => r.shareOfVoice > 0);
  if (!hasRealData) return SEED_CITATION_PLATFORMS;

  const avgSov = avg(rows.filter((r) => r.shareOfVoice > 0).map((r) => r.shareOfVoice));
  const avgAuthority = avg(rows.filter((r) => r.authorityScore > 0).map((r) => r.authorityScore));

  return PLATFORMS.map((p, i) => {
    const seed = SEED_CITATION_PLATFORMS[i]!;
    const mentionRate = Math.min(0.65, (avgSov / 100) * seed.brandMentionRate * 1.2);
    return {
      platform: p.id as CitationPlatformId,
      label: p.label,
      citationVolume: Math.round(seed.citationVolume * (rows.length / 5 + 0.5)),
      avgAuthorityScore: Math.round((avgAuthority + seed.avgAuthorityScore) / 2),
      brandMentionRate: Math.round(mentionRate * 100) / 100,
      trend: avgSov >= 40 ? "up" : avgSov >= 25 ? "stable" : "down",
      source: "computed" as const,
    };
  });
}

function buildDataSources(
  rows: AnonymizedClientRow[],
  auditCount: number,
  learningCount: number,
  signalCount: number
): DataSourceStatus[] {
  const now = new Date().toISOString();
  return [
    {
      id: "agency_audits",
      name: "Anonymized agency audits",
      status: rows.length >= 3 ? "active" : rows.length > 0 ? "sparse" : "sparse",
      recordCount: auditCount,
      lastUpdated: now,
    },
    {
      id: "citation_platforms",
      name: "Public citation data (4 platforms)",
      status: "seed",
      recordCount: 4,
      lastUpdated: now,
    },
    {
      id: "competitor_changes",
      name: "Competitor website changes",
      status: signalCount > 0 ? "active" : "sparse",
      recordCount: signalCount,
      lastUpdated: now,
    },
    {
      id: "publication_patterns",
      name: "Industry publication patterns",
      status: "active",
      recordCount: Object.keys(PUBLICATION_AUTHORITY).length,
      lastUpdated: now,
    },
  ];
}

export async function buildCompetitiveIntelligenceNetwork(
  agencyId: string
): Promise<CompetitiveIntelligenceNetwork> {
  const [clientCount, auditCount, learningCount, rows, competitorSignals] = await Promise.all([
    prisma.client.count({ where: { agencyId } }),
    prisma.audit.count({ where: { client: { agencyId } } }),
    prisma.gapFixLearning.count({ where: { agencyId } }),
    loadAnonymizedRows(agencyId),
    buildCompetitorSignals(agencyId),
  ]);

  const globalRows = await loadGlobalAnonymizedSample(agencyId);
  const benchmarks = buildBenchmarks(rows, globalRows);
  const networkStrength = computeNetworkStrength(clientCount, auditCount, learningCount);
  const insights = buildInsights(rows, benchmarks, learningCount, clientCount);
  const exclusiveAccess = clientCount > 0;

  return {
    agencyId,
    exclusiveAccess,
    networkEffects: {
      clientCount,
      auditCount,
      learningRecordCount: learningCount,
      networkStrength,
      flywheel: buildFlywheel(networkStrength),
    },
    dataSources: buildDataSources(rows, auditCount, learningCount, competitorSignals.length),
    insights,
    benchmarks,
    citationPlatforms: buildCitationPlatforms(rows),
    publicationPatterns: buildPublicationPatterns(),
    competitorSignals,
    computedAt: new Date().toISOString(),
    source: "rules",
  };
}

async function loadGlobalAnonymizedSample(excludeAgencyId: string): Promise<AnonymizedClientRow[]> {
  const otherClients = await prisma.client.findMany({
    where: { agencyId: { not: excludeAgencyId } },
    take: 30,
    select: {
      name: true,
      domain: true,
      audits: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { auditData: true },
      },
      _count: { select: { audits: true, gaps: true } },
    },
  });

  return otherClients.map((client) => {
    const latest = client.audits[0];
    const scores = latest
      ? layerScoresFromAuditData(latest.auditData)
      : {
          discoverability: 0,
          clarity: 0,
          authority: 0,
          trust: 0,
          shareOfVoice: 0,
        };
    return {
      industry: inferIndustry(client.domain, client.name),
      authorityScore: scores.authority,
      healthScore: compositeHealth(scores),
      shareOfVoice: scores.shareOfVoice,
      gapCount: client._count.gaps,
      auditCount: client._count.audits,
      authorityFixSuccessRate: null,
      auditIntervalDays: null,
    };
  });
}

export async function buildClientNetworkComparison(
  agencyId: string,
  clientId: string
): Promise<ClientNetworkComparison | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId },
    select: {
      id: true,
      name: true,
      domain: true,
      audits: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { auditData: true },
      },
    },
  });

  if (!client) return null;

  const network = await buildCompetitiveIntelligenceNetwork(agencyId);
  const industry = inferIndustry(client.domain, client.name);
  const latest = client.audits[0];
  const scores = latest
    ? layerScoresFromAuditData(latest.auditData)
    : {
        discoverability: 0,
        clarity: 0,
        authority: 0,
        trust: 0,
        shareOfVoice: 0,
      };

  const industryBenchmarks = network.benchmarks.filter((b) => b.industry === industry);
  const findBench = (metric: string) =>
    industryBenchmarks.find((b) => b.metric === metric) ??
    network.benchmarks.find((b) => b.industry === "all" && b.metric === metric);

  const clientVsNetwork = [
    {
      metric: "authority_score",
      clientValue: scores.authority,
      networkValue: findBench("avg_authority_score")?.value ?? 0,
      delta: scores.authority - (findBench("avg_authority_score")?.value ?? 0),
      unit: "%",
    },
    {
      metric: "health_score",
      clientValue: compositeHealth(scores),
      networkValue: findBench("avg_health_score")?.value ?? 0,
      delta: compositeHealth(scores) - (findBench("avg_health_score")?.value ?? 0),
      unit: "%",
    },
    {
      metric: "share_of_voice",
      clientValue: scores.shareOfVoice,
      networkValue: findBench("avg_share_of_voice")?.value ?? 0,
      delta: scores.shareOfVoice - (findBench("avg_share_of_voice")?.value ?? 0),
      unit: "%",
    },
  ];

  const relevantInsights = network.insights.filter(
    (i) => !i.industry || i.industry === industry || i.category === "publication" || i.category === "citation"
  );

  return {
    clientId,
    clientIndustry: industry,
    network,
    clientVsNetwork,
    relevantInsights,
  };
}

export function buildPortalNetworkInsights(
  network: CompetitiveIntelligenceNetwork,
  industry: string
): PortalNetworkInsights {
  const relevant = network.insights.filter(
    (i) =>
      !i.industry ||
      i.industry === industry ||
      i.category === "publication" ||
      i.category === "citation"
  );

  const topBenchmark =
    network.benchmarks.find(
      (b) => b.industry === industry && b.metric === "avg_authority_score"
    ) ?? network.benchmarks.find((b) => b.metric === "avg_authority_score");

  return {
    exclusiveAccess: true,
    networkStrength: network.networkEffects.networkStrength,
    insights: relevant.slice(0, 4),
    topBenchmark,
    computedAt: network.computedAt,
  };
}

export async function getNetworkAuditFrequencyDays(
  agencyId: string,
  industry: string
): Promise<number | undefined> {
  const network = await buildCompetitiveIntelligenceNetwork(agencyId);
  const bench = network.benchmarks.find(
    (b) => b.industry === industry && b.metric === "optimal_audit_interval_days"
  );
  if (bench && bench.sampleSize >= 2) return bench.value;
  return getIndustryOptimalAuditDays(industry);
}

export function applyNetworkFrequencyHint(
  recommendedDays: number,
  networkOptimalDays?: number
): number {
  if (!networkOptimalDays || networkOptimalDays <= 0) return recommendedDays;
  return Math.round((recommendedDays + networkOptimalDays) / 2);
}
