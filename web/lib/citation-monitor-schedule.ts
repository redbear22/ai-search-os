import "server-only";

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export interface CitationMonitorSchedule {
  id: string;
  brandName: string;
  queries: string[];
  competitors: string[];
  enabled: boolean;
  notifyEmail?: string;
  createdAt: string;
  lastRunAt?: string;
}

export interface CitationMonitorRunSummary {
  scheduleId: string;
  brandName: string;
  ranAt: string;
  totalChecked: number;
  gapsFound: number;
  topGaps: Array<{
    query: string;
    platform: string;
    competitorCited: string;
    severity: string;
  }>;
}

function schedulesPath(): string {
  const custom = process.env.CITATION_MONITOR_SCHEDULES_FILE?.trim();
  if (custom) return path.resolve(custom);
  return path.join(process.cwd(), "data", "citation_monitor", "schedules.json");
}

function runsPath(): string {
  const custom = process.env.CITATION_MONITOR_RUNS_FILE?.trim();
  if (custom) return path.resolve(custom);
  return path.join(process.cwd(), "data", "citation_monitor", "runs.json");
}

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

function parseEnvSchedule(): CitationMonitorSchedule | null {
  const raw = process.env.CITATION_MONITOR_CRON_CONFIG?.trim();
  if (!raw) return null;

  try {
    const config = JSON.parse(raw) as Partial<CitationMonitorSchedule>;
    if (!config.brandName || !config.queries?.length) return null;

    return {
      id: config.id ?? "env-default",
      brandName: config.brandName,
      queries: config.queries.filter(Boolean),
      competitors: config.competitors ?? [],
      enabled: config.enabled !== false,
      notifyEmail: config.notifyEmail,
      createdAt: config.createdAt ?? new Date().toISOString(),
      lastRunAt: config.lastRunAt,
    };
  } catch {
    return null;
  }
}

export async function loadCitationMonitorSchedules(): Promise<
  CitationMonitorSchedule[]
> {
  const filePath = schedulesPath();
  let fromFile: CitationMonitorSchedule[] = [];

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as CitationMonitorSchedule[];
    if (Array.isArray(parsed)) fromFile = parsed;
  } catch {
    fromFile = [];
  }

  const envSchedule = parseEnvSchedule();
  if (!envSchedule) return fromFile;

  const hasEnv = fromFile.some((s) => s.id === envSchedule.id);
  return hasEnv ? fromFile : [...fromFile, envSchedule];
}

export async function saveCitationMonitorSchedule(
  schedule: Omit<CitationMonitorSchedule, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): Promise<CitationMonitorSchedule> {
  const filePath = schedulesPath();
  await ensureDir(filePath);

  const schedules = await loadCitationMonitorSchedules();
  const existing = schedule.id
    ? schedules.find((s) => s.id === schedule.id)
    : undefined;

  const saved: CitationMonitorSchedule = {
    id: schedule.id ?? existing?.id ?? `schedule_${Date.now()}`,
    brandName: schedule.brandName.trim(),
    queries: schedule.queries.map((q) => q.trim()).filter(Boolean),
    competitors: schedule.competitors.map((c) => c.trim()).filter(Boolean),
    enabled: schedule.enabled,
    notifyEmail: schedule.notifyEmail?.trim() || undefined,
    createdAt: existing?.createdAt ?? schedule.createdAt ?? new Date().toISOString(),
    lastRunAt: schedule.lastRunAt ?? existing?.lastRunAt,
  };

  const next = existing
    ? schedules.map((s) => (s.id === saved.id ? saved : s))
    : [...schedules.filter((s) => s.id !== "env-default"), saved];

  await writeFile(filePath, JSON.stringify(next, null, 2), "utf8");
  return saved;
}

export async function markScheduleLastRun(
  scheduleId: string,
  ranAt: string
): Promise<void> {
  const filePath = schedulesPath();
  const schedules = await loadCitationMonitorSchedules();
  const updated = schedules.map((s) =>
    s.id === scheduleId ? { ...s, lastRunAt: ranAt } : s
  );

  if (scheduleId === "env-default") return;

  try {
    await ensureDir(filePath);
    await writeFile(filePath, JSON.stringify(updated, null, 2), "utf8");
  } catch {
    // Env-only schedules have nothing to persist on Vercel
  }
}

export async function appendCitationMonitorRun(
  summary: CitationMonitorRunSummary
): Promise<void> {
  const filePath = runsPath();
  await ensureDir(filePath);

  let runs: CitationMonitorRunSummary[] = [];
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as CitationMonitorRunSummary[];
    if (Array.isArray(parsed)) runs = parsed;
  } catch {
    runs = [];
  }

  runs.unshift(summary);
  await writeFile(
    filePath,
    JSON.stringify(runs.slice(0, 100), null, 2),
    "utf8"
  );
}
