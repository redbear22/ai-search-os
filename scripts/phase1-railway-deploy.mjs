/**
 * Phase 1 Audit Agent — set Railway env vars (no stdout secrets).
 * Usage: node scripts/phase1-railway-deploy.mjs [--dry-run]
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" };

function rail(args, cwd = root) {
  return execSync(`railway ${args}`, { cwd, encoding: "utf8", env, stdio: "pipe" });
}

function parseEnvFile(path, prefix) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const line = lines.find((l) => l.startsWith(`${prefix}=`));
  if (!line) return null;
  let v = line.slice(prefix.length + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  return v || null;
}

function meta(url) {
  const m = url?.match(/@([^:/]+):(\d+)\//);
  return {
    host: m?.[1] ?? "?",
    port: m?.[2] ?? "?",
    scheme: url?.split(":")[0] ?? "?",
    pgbouncer: /pgbouncer|6543/.test(url ?? ""),
  };
}

function toDirectUrl(url) {
  if (url.includes("pooler.supabase.com:6543")) {
    return url
      .replace("pooler.supabase.com:6543", "pooler.supabase.com:5432")
      .replace(/[?&]pgbouncer=true/, "");
  }
  return url.replace(/[?&]pgbouncer=true/, "");
}

function setVarSync(service, key, value) {
  if (dryRun) {
    console.log(`[dry-run] set ${key} on ${service}`);
    return;
  }
  execSync(`railway variable set ${key} --stdin --service "${service}" --skip-deploys`, {
    cwd: root,
    input: value,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

const redisVars = JSON.parse(rail("variables --service Redis --json"));
const redisUrl = redisVars.REDIS_URL || redisVars.REDIS_PUBLIC_URL;
if (!redisUrl) {
  console.error("BLOCKER: Railway Redis REDIS_URL not found (Redis service offline?)");
  process.exit(1);
}

let citationDb = null;
try {
  const citationVars = JSON.parse(rail("variables --json", "d:/Dev/my-ai-seo"));
  citationDb =
    citationVars.CITATION_DATABASE_URL_DIRECT || citationVars.CITATION_DATABASE_URL;
} catch {
  /* my-ai-seo not linked */
}

if (!citationDb) {
  const base =
    parseEnvFile(join(root, "web/.env.local"), "POSTGRES_URL_NON_POOLING") ||
    parseEnvFile(join(root, "web/.env.local"), "DIRECT_URL") ||
    parseEnvFile(join(root, "web/.env.local"), "DATABASE_URL");
  citationDb = base ? toDirectUrl(base) : null;
}

if (!citationDb) {
  console.error("BLOCKER: no CITATION_DATABASE_URL source");
  process.exit(1);
}

const services = ["aisearchrank-agent-api"];
try {
  const list = JSON.parse(rail("service list --json"));
  const worker = list.find((s) => /worker/i.test(s.name));
  if (worker) services.push(worker.name);
} catch {
  /* ignore */
}

console.log("redis:", JSON.stringify(meta(redisUrl)));
console.log("citation_db:", JSON.stringify(meta(citationDb)));
console.log("target_services:", services.join(", "));

for (const svc of services) {
  setVarSync(svc, "REDIS_URL", redisUrl);
  setVarSync(svc, "CITATION_DATABASE_URL", citationDb);
}

console.log("env vars set (deploys skipped).");
