import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

/** Public marketing demo — no auth, static sample data (FlowStack). */
export async function GET() {
  const htmlPath = join(process.cwd(), "content", "sample-audit-page.html");
  const html = readFileSync(htmlPath, "utf8");
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
