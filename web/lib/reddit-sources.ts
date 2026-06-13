export type RedditSource = {
  title: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  url: string;
  brandMentioned: boolean;
  citationScore: number;
};

function brandInText(text: string, brand: string): boolean {
  if (!brand.trim()) return false;
  return text.toLowerCase().includes(brand.toLowerCase().trim());
}

function citationScore(upvotes: number, comments: number): number {
  return Math.round(Math.log10(Math.max(upvotes, 1) + 1) * 30 + Math.log10(comments + 1) * 20);
}

export async function fetchRedditSources(
  topic: string,
  brand?: string
): Promise<RedditSource[]> {
  const q = encodeURIComponent(topic.trim());
  const url = `https://www.reddit.com/search.json?q=${q}&sort=top&t=year&limit=25`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "AISearchRank/1.0 (AI visibility platform; +https://www.aisearchrank.ai)",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Reddit API ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: {
      children?: {
        data?: {
          title?: string;
          subreddit?: string;
          ups?: number;
          num_comments?: number;
          permalink?: string;
          selftext?: string;
        };
      }[];
    };
  };

  const posts = json.data?.children ?? [];
  const results: RedditSource[] = [];

  for (const child of posts.slice(0, 10)) {
    const d = child.data;
    if (!d?.title) continue;
    const title = d.title;
    const body = d.selftext ?? "";
    const mentioned = brandInText(`${title} ${body}`, brand ?? "");
    const upvotes = d.ups ?? 0;
    const comments = d.num_comments ?? 0;

    results.push({
      title: title.length > 80 ? `${title.slice(0, 77)}…` : title,
      subreddit: d.subreddit ?? "unknown",
      upvotes,
      comments,
      url: d.permalink ? `https://www.reddit.com${d.permalink}` : "",
      brandMentioned: mentioned,
      citationScore: citationScore(upvotes, comments),
    });
  }

  results.sort((a, b) => b.citationScore - a.citationScore);
  return results.slice(0, 5);
}
