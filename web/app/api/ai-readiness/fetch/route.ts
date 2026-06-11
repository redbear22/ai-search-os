import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const USER_AGENT = "Mozilla/5.0 (compatible; AIReadinessBot/1.0)";

async function probeOk(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    const html = await response.text();
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const origin = new URL(url).origin;
    const [llmsTxtOk, llmsFullTxtOk, robotsResponse] = await Promise.all([
      probeOk(`${origin}/llms.txt`),
      probeOk(`${origin}/llms-full.txt`),
      fetch(`${origin}/robots.txt`, {
        headers: { "User-Agent": USER_AGENT },
      }).catch(() => null),
    ]);

    let robotsTxt = "";
    if (robotsResponse?.ok) {
      robotsTxt = await robotsResponse.text();
    }

    return NextResponse.json({
      html,
      text,
      wordCount,
      headers,
      status: response.status,
      llmsTxtOk,
      llmsFullTxtOk,
      robotsTxt,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch URL" },
      { status: 500 }
    );
  }
}
