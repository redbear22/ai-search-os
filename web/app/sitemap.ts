import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  }
  return "https://www.aisearchrank.ai";
}

/** Public marketing and product landing routes for AI Search Rank. */
const MARKETING_ROUTES: {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/free-audit", changeFrequency: "weekly", priority: 0.9 },
  { path: "/sample-audit", changeFrequency: "monthly", priority: 0.85 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/crawler-logs", changeFrequency: "monthly", priority: 0.75 },
  { path: "/ai-sources", changeFrequency: "monthly", priority: 0.75 },
  { path: "/agent-readiness", changeFrequency: "monthly", priority: 0.75 },
  { path: "/ai-readiness", changeFrequency: "monthly", priority: 0.75 },
  { path: "/citation-intelligence", changeFrequency: "monthly", priority: 0.75 },
  { path: "/citation-monitor", changeFrequency: "monthly", priority: 0.7 },
  { path: "/zero-click-visibility", changeFrequency: "monthly", priority: 0.7 },
  { path: "/entity-trust", changeFrequency: "monthly", priority: 0.7 },
  { path: "/ai-comparison", changeFrequency: "monthly", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();

  return MARKETING_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
