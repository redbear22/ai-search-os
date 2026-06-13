import {
  AI_CRAWLERS,
  ROBOTS_BOT_TOKENS,
  type CrawlerKey,
} from "@/lib/crawler-agents";

export type RobotsCheckResult = {
  robotsBlocked: boolean;
  sitemapExists: boolean;
  sitemapUrls: string[];
  blockedBots: string[];
  robotsTxt: string | null;
  siteUrl: string;
};

function normalizeSiteUrl(raw: string): string {
  let url = raw.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}

function parseRobotsDisallows(robotsTxt: string): Map<string, Set<string>> {
  const lines = robotsTxt.split(/\r?\n/);
  const rules = new Map<string, Set<string>>();
  let currentAgents: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const agentMatch = line.match(/^User-agent:\s*(.+)$/i);
    if (agentMatch) {
      currentAgents = [agentMatch[1].trim().toLowerCase()];
      continue;
    }

    const disallowMatch = line.match(/^Disallow:\s*(.*)$/i);
    if (disallowMatch && currentAgents.length > 0) {
      const path = disallowMatch[1].trim() || "/";
      for (const agent of currentAgents) {
        if (!rules.has(agent)) rules.set(agent, new Set());
        rules.get(agent)!.add(path);
      }
    }
  }

  return rules;
}

function isBotBlocked(rules: Map<string, Set<string>>, tokens: string[]): boolean {
  for (const token of tokens) {
    const key = token.toLowerCase();
    const disallows = rules.get(key);
    if (disallows?.has("/") || disallows?.has("")) return true;
  }
  const wildcard = rules.get("*");
  if (wildcard?.has("/") || wildcard?.has("")) return true;
  return false;
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "AISearchRank-CrawlerCheck/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractSitemapUrls(robotsTxt: string, base: string): string[] {
  const urls: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const m = line.match(/^Sitemap:\s*(.+)$/i);
    if (m) urls.push(m[1].trim());
  }
  if (urls.length === 0) {
    urls.push(`${base}/sitemap.xml`);
  }
  return urls;
}

async function parseSitemapUrls(sitemapUrl: string, depth = 0): Promise<string[]> {
  if (depth > 2) return [];
  const text = await fetchText(sitemapUrl);
  if (!text) return [];

  const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  const paths: string[] = [];

  for (const loc of locs) {
    if (loc.endsWith(".xml") && depth < 2) {
      const nested = await parseSitemapUrls(loc, depth + 1);
      paths.push(...nested);
    } else {
      try {
        const u = new URL(loc);
        paths.push(u.pathname || "/");
      } catch {
        paths.push(loc);
      }
    }
  }

  return paths;
}

export async function checkSiteRobots(rawSiteUrl: string): Promise<RobotsCheckResult> {
  const siteUrl = normalizeSiteUrl(rawSiteUrl);
  const robotsUrl = `${siteUrl}/robots.txt`;
  const robotsTxt = await fetchText(robotsUrl);

  const blockedBots: string[] = [];
  if (robotsTxt) {
    const rules = parseRobotsDisallows(robotsTxt);
    for (const key of Object.keys(AI_CRAWLERS) as CrawlerKey[]) {
      if (isBotBlocked(rules, ROBOTS_BOT_TOKENS[key])) {
        blockedBots.push(key);
      }
    }
  }

  let sitemapUrls: string[] = [];
  let sitemapExists = false;

  if (robotsTxt) {
    const candidates = extractSitemapUrls(robotsTxt, siteUrl);
    for (const candidate of candidates) {
      const paths = await parseSitemapUrls(candidate);
      if (paths.length > 0) {
        sitemapExists = true;
        sitemapUrls = paths;
        break;
      }
      const head = await fetchText(candidate);
      if (head && (head.includes("<urlset") || head.includes("<sitemapindex"))) {
        sitemapExists = true;
        sitemapUrls = await parseSitemapUrls(candidate);
        break;
      }
    }
  } else {
    const defaultSitemap = `${siteUrl}/sitemap.xml`;
    const paths = await parseSitemapUrls(defaultSitemap);
    if (paths.length > 0) {
      sitemapExists = true;
      sitemapUrls = paths;
    }
  }

  return {
    robotsBlocked: blockedBots.length > 0,
    sitemapExists,
    sitemapUrls: [...new Set(sitemapUrls)].slice(0, 500),
    blockedBots,
    robotsTxt,
    siteUrl,
  };
}

export function robotsFixSuggestions(result: RobotsCheckResult): string[] {
  const fixes: string[] = [];
  if (result.blockedBots.length > 0) {
    for (const bot of result.blockedBots) {
      const info = AI_CRAWLERS[bot as CrawlerKey];
      fixes.push(
        `Remove or narrow the Disallow rule for ${info.name} (${ROBOTS_BOT_TOKENS[bot as CrawlerKey].join(", ")}) in robots.txt so AI crawlers can index your content.`
      );
    }
  }
  if (!result.sitemapExists) {
    fixes.push(
      "Add a sitemap.xml and reference it in robots.txt with `Sitemap: https://yoursite.com/sitemap.xml`."
    );
  }
  return fixes;
}
