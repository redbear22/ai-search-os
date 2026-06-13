import { detectCrawler, type CrawlerKey } from "@/lib/crawler-agents";

export type ParsedCrawlerHit = {
  bot: CrawlerKey;
  page: string;
  statusCode: number | null;
  timestamp: Date | null;
  ip: string | null;
  method: string | null;
};

const MAX_LINES = 50_000;

/** Common Log Format: host ident authuser date request status bytes referer user-agent */
const CLF_REGEX =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) \S+(?: "([^"]*)")?(?: "([^"]*)")?/;

/** Combined log format (Apache/Nginx) with quoted user-agent at end */
const COMBINED_REGEX =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) \S+ "([^"]*)" "([^"]*)"/;

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function parseClfDate(raw: string): Date | null {
  // 10/Jun/2025:13:55:36 +0000
  const m = raw.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2]];
  const year = Number(m[3]);
  if (month === undefined) return null;
  const hour = Number(m[4]);
  const min = Number(m[5]);
  const sec = Number(m[6]);
  return new Date(Date.UTC(year, month, day, hour, min, sec));
}

function parseLine(line: string): ParsedCrawlerHit | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  let match = trimmed.match(COMBINED_REGEX);
  if (!match) match = trimmed.match(CLF_REGEX);
  if (!match) return null;

  const [, ip, dateStr, method, path, statusStr, , userAgent] = match;
  const bot = detectCrawler(userAgent ?? "");
  if (!bot) return null;

  const statusCode = Number(statusStr);
  return {
    bot,
    page: path,
    statusCode: Number.isFinite(statusCode) ? statusCode : null,
    timestamp: parseClfDate(dateStr),
    ip: ip ?? null,
    method: method ?? null,
  };
}

export type LogParseResult = {
  hits: ParsedCrawlerHit[];
  linesProcessed: number;
  truncated: boolean;
};

export function parseAccessLogContent(content: string): LogParseResult {
  const lines = content.split(/\r?\n/);
  const truncated = lines.length > MAX_LINES;
  const slice = truncated ? lines.slice(0, MAX_LINES) : lines;

  const hits: ParsedCrawlerHit[] = [];
  for (const line of slice) {
    const hit = parseLine(line);
    if (hit) hits.push(hit);
  }

  return { hits, linesProcessed: slice.length, truncated };
}

export type BotSummary = {
  bot: CrawlerKey;
  pagesCrawled: number;
  uniquePages: string[];
  lastSeen: string | null;
  errors: { page: string; statusCode: number }[];
};

export type CrawlerAnalysis = {
  byBot: BotSummary[];
  allCrawledPaths: Set<string>;
  errors: { bot: CrawlerKey; page: string; statusCode: number }[];
};

export function aggregateCrawlerHits(hits: ParsedCrawlerHit[]): CrawlerAnalysis {
  const byBotMap = new Map<
    CrawlerKey,
    { paths: Set<string>; lastSeen: Date | null; errors: { page: string; statusCode: number }[] }
  >();

  for (const hit of hits) {
    let entry = byBotMap.get(hit.bot);
    if (!entry) {
      entry = { paths: new Set(), lastSeen: null, errors: [] };
      byBotMap.set(hit.bot, entry);
    }
    entry.paths.add(hit.page);
    if (hit.timestamp && (!entry.lastSeen || hit.timestamp > entry.lastSeen)) {
      entry.lastSeen = hit.timestamp;
    }
    if (hit.statusCode && hit.statusCode >= 400) {
      entry.errors.push({ page: hit.page, statusCode: hit.statusCode });
    }
  }

  const allCrawledPaths = new Set<string>();
  const byBot: BotSummary[] = [];
  const errors: CrawlerAnalysis["errors"] = [];

  for (const [bot, data] of byBotMap) {
    data.paths.forEach((p) => allCrawledPaths.add(p));
    for (const err of data.errors) {
      errors.push({ bot, ...err });
    }
    byBot.push({
      bot,
      pagesCrawled: data.paths.size,
      uniquePages: [...data.paths],
      lastSeen: data.lastSeen?.toISOString() ?? null,
      errors: data.errors,
    });
  }

  byBot.sort((a, b) => b.pagesCrawled - a.pagesCrawled);
  return { byBot, allCrawledPaths, errors };
}

/** Key pages that warrant HIGH severity if never crawled */
export const KEY_PAGE_PATTERNS = [
  /^\/$/,
  /^\/about/i,
  /^\/pricing/i,
  /^\/product/i,
  /^\/services/i,
  /^\/case-stud/i,
  /^\/blog/i,
  /^\/contact/i,
];

export function gapSeverityForPath(path: string): "high" | "medium" {
  return KEY_PAGE_PATTERNS.some((re) => re.test(path)) ? "high" : "medium";
}
