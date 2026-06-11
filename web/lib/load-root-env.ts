import "server-only";
import fs from "fs";
import path from "path";

const ENV_PLACEHOLDERS = new Set(["your-gemini-key-here", "your-key-here"]);

function isEmptyEnvValue(value: string | undefined): boolean {
  if (value === undefined) return true;
  const trimmed = value.trim();
  return !trimmed || ENV_PLACEHOLDERS.has(trimmed);
}

/** Fill unset/empty process.env keys from repo-root .env.local (web/.env.local wins). */
export function loadRootEnvFallback(): void {
  const rootLocal = path.resolve(process.cwd(), "..", ".env.local");
  if (!fs.existsSync(rootLocal)) return;

  const lines = fs.readFileSync(rootLocal, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    const current = process.env[key];
    if (isEmptyEnvValue(current)) {
      process.env[key] = value;
    }
  }
}
