export type YouTubeSource = {
  title: string;
  channel: string;
  views: number;
  publishedAt: string;
  url: string;
  brandMentioned: boolean;
};

function brandInText(text: string, brand: string): boolean {
  if (!brand.trim()) return false;
  return text.toLowerCase().includes(brand.toLowerCase().trim());
}

export async function fetchYouTubeSources(
  topic: string,
  brand?: string
): Promise<{ sources: YouTubeSource[]; configured: boolean; message?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return {
      sources: [],
      configured: false,
      message: "Add YouTube API key in settings to enable YouTube tracking",
    };
  }

  const q = encodeURIComponent(topic.trim());
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", topic.trim());
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "viewCount");
  searchUrl.searchParams.set("maxResults", "10");
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl.toString(), { cache: "no-store" });
  if (!searchRes.ok) {
    return { sources: [], configured: true, message: `YouTube API error ${searchRes.status}` };
  }

  const searchJson = (await searchRes.json()) as {
    items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; publishedAt?: string; description?: string } }[];
  };

  const videoIds = (searchJson.items ?? [])
    .map((i) => i.id?.videoId)
    .filter(Boolean) as string[];

  if (videoIds.length === 0) {
    return { sources: [], configured: true };
  }

  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "statistics,snippet");
  statsUrl.searchParams.set("id", videoIds.join(","));
  statsUrl.searchParams.set("key", apiKey);

  const statsRes = await fetch(statsUrl.toString(), { cache: "no-store" });
  if (!statsRes.ok) {
    return { sources: [], configured: true, message: `YouTube stats API error ${statsRes.status}` };
  }

  const statsJson = (await statsRes.json()) as {
    items?: {
      id?: string;
      snippet?: { title?: string; channelTitle?: string; publishedAt?: string; description?: string };
      statistics?: { viewCount?: string };
    }[];
  };

  const sources: YouTubeSource[] = (statsJson.items ?? []).map((item) => {
    const title = item.snippet?.title ?? "";
    const description = item.snippet?.description ?? "";
    const views = Number(item.statistics?.viewCount ?? 0);
    return {
      title,
      channel: item.snippet?.channelTitle ?? "",
      views,
      publishedAt: item.snippet?.publishedAt ?? "",
      url: item.id ? `https://www.youtube.com/watch?v=${item.id}` : "",
      brandMentioned: brandInText(`${title} ${description}`, brand ?? ""),
    };
  });

  sources.sort((a, b) => b.views - a.views);
  return { sources: sources.slice(0, 5), configured: true };
}
