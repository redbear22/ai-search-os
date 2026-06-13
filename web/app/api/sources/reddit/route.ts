import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchRedditSources } from "@/lib/reddit-sources";
import {
  buildSourceCacheKey,
  getCachedSource,
  setCachedSource,
} from "@/lib/source-cache";

let lastRedditFetch = 0;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic")?.trim();
  const brand = searchParams.get("brand")?.trim() ?? "";

  if (!topic) {
    return NextResponse.json({ error: "topic query param required" }, { status: 400 });
  }

  const cacheKey = buildSourceCacheKey("reddit", topic, brand);
  const cached = await getCachedSource<{ sources: Awaited<ReturnType<typeof fetchRedditSources>> }>(
    cacheKey
  );
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const now = Date.now();
  const waitMs = Math.max(0, 2000 - (now - lastRedditFetch));
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  lastRedditFetch = Date.now();

  try {
    const sources = await fetchRedditSources(topic, brand);
    const payload = { sources, topic, brand };
    await setCachedSource(cacheKey, "reddit", topic, brand, payload);
    return NextResponse.json({ ...payload, cached: false });
  } catch (err) {
    return NextResponse.json({
      sources: [],
      topic,
      brand,
      error: err instanceof Error ? err.message : "Reddit fetch failed",
    });
  }
}
