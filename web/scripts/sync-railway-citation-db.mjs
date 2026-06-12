/**
 * Sync Supabase URLs from Vercel production env to Railway citation service.
 * Prints metadata only — never logs full connection strings.
 */
import { execSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.vercel.sync");

execSync("vercel env pull .env.vercel.sync --environment=production --yes", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
});

const lines = readFileSync(envFile, "utf8").split(/\r?\n/);

function get(key) {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  let v = line.slice(key.length + 1);
  if (v.startsWith('"')) {
    try {
      v = JSON.parse(v);
    } catch {
      v = v.replace(/^"|"$/g, "");
    }
  }
  return v;
}

function meta(url) {
  if (!url) return null;
  const m = url.match(/@([^:/]+):(\d+)\//);
  return {
    host: m?.[1] ?? "?",
    port: m?.[2] ?? "?",
    pgbouncer: url.includes("pgbouncer"),
  };
}

const pooled =
  get("POSTGRES_PRISMA_URL") || get("DATABASE_URL") || get("POSTGRES_URL");
const direct = get("POSTGRES_URL_NON_POOLING");

if (!pooled) {
  console.error("Missing POSTGRES_PRISMA_URL / DATABASE_URL on Vercel");
  process.exit(1);
}

const out = {
  CITATION_DATABASE_URL: pooled,
  ...(direct ? { CITATION_DATABASE_URL_DIRECT: direct } : {}),
};

const syncFile = join(root, ".railway-citation-db.env");
for (const [k, v] of Object.entries(out)) {
  writeFileSync(syncFile, `${k}=${v}\n`, { flag: "a" });
}

console.log("pooled:", meta(pooled));
console.log("direct:", meta(direct));
console.log("sync_file:", syncFile);

unlinkSync(envFile);
