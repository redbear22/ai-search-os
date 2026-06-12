import { config } from "dotenv";
import { spawnSync } from "child_process";
import { resolve } from "path";
import { normalizeDatabaseUrlForRuntime } from "../lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const rawUrl = process.env.DATABASE_URL?.trim();
const databaseUrl = rawUrl
  ? normalizeDatabaseUrlForRuntime(
      (() => {
        process.env.VERCEL = "1";
        return rawUrl;
      })()
    )
  : undefined;
if (!databaseUrl) {
  console.error("DATABASE_URL missing in web/.env.local");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["vercel", "env", "update", "DATABASE_URL", "production", "--yes", "--value", databaseUrl],
  {
    cwd: process.cwd(),
    env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    encoding: "utf8",
  }
);

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (result.status === 0) {
  console.log("Updated Vercel production DATABASE_URL");
} else {
  process.exit(result.status ?? 1);
}
