import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchYouTubeSources } from "@/lib/youtube-sources";
import {
  buildSourceCacheKey,
  getCachedSource,
  setCachedSource,
} from "@/lib/source-cache";

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

  const cacheKey = buildSourceCacheKey("youtube", topic, brand);
  const cached = await getCachedSource<{
    sources: Awaited<ReturnType<typeof fetchYouTubeSources>>["sources"];
    configured: boolean;
    message?: string;
  }>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, topic, brand, cached: true });
  }

  try {
    const result = await fetchYouTubeSources(topic, brand);
    const payload = { sources: result.sources, configured: result.configured, message: result.message };
    await setCachedSource(cacheKey, "youtube", topic, brand, payload);
    return NextResponse.json({ ...payload, topic, brand, cached: false });
  } catch (err) {
    return NextResponse.json({
      sources: [],
      configured: Boolean(process.env.YOUTUBE_API_KEY?.trim()),
      topic,
      brand,
      error: err instanceof Error ? err.message : "YouTube fetch failed",
    });
  }
}
