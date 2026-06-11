import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const targetDir = process.argv[2] ?? join(process.cwd(), ".next");

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    if (path.endsWith(".map")) {
      unlinkSync(path);
    }
  }
}

try {
  walk(targetDir);
  console.log(`[strip-source-maps] Removed .map files under ${targetDir}`);
} catch (error) {
  console.warn("[strip-source-maps] Skipped:", error instanceof Error ? error.message : error);
}
