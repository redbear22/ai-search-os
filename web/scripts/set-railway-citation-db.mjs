/**
 * Set Railway citation DB env from local Supabase URLs (no stdout secrets).
 */
import { execSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const localEnv = readFileSync(join(webRoot, ".env.local"), "utf8").split(/\r?\n/);

function parseLine(prefix) {
  const line = localEnv.find((l) => l.startsWith(`${prefix}=`));
  if (!line) return null;
  let v = line.slice(prefix.length + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  return v || null;
}

function meta(url) {
  const m = url?.match(/@([^:/]+):(\d+)\//);
  return {
    host: m?.[1] ?? "?",
    port: m?.[2] ?? "?",
    pgbouncer: Boolean(url?.includes("pgbouncer")),
  };
}

function toPooledUrl(url) {
  let pooled = url;
  if (pooled.includes("pooler.supabase.com:5432")) {
    pooled = pooled.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  }
  if (!pooled.includes("pgbouncer=true")) {
    pooled += (pooled.includes("?") ? "&" : "?") + "pgbouncer=true";
  }
  return pooled;
}

function toDirectUrl(url) {
  // Session pooler on 5432 works as a direct-ish connection for psycopg DDL if needed.
  if (url.includes("pooler.supabase.com:6543")) {
    return url.replace("pooler.supabase.com:6543", "pooler.supabase.com:5432").replace(
      /[?&]pgbouncer=true/,
      ""
    );
  }
  return url;
}

const base = parseLine("DATABASE_URL");
if (!base) {
  console.error("DATABASE_URL missing in web/.env.local");
  process.exit(1);
}

const pooled = toPooledUrl(base);
const direct = toDirectUrl(base);

const vars = {
  CITATION_DATABASE_URL: pooled,
  CITATION_DATABASE_URL_DIRECT: direct,
};

console.log("pooled:", meta(pooled));
console.log("direct:", meta(direct));

const myAiSeo = "d:/Dev/my-ai-seo";
for (const [key, value] of Object.entries(vars)) {
  execSync(`railway variables set ${key}=${value}`, {
    cwd: myAiSeo,
    stdio: "pipe",
    env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
  });
}

console.log("Railway citation DB vars updated.");
