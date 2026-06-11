import "server-only";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function getCachedResponse<T>(key: string, ttlSeconds = 3600): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlSeconds * 1000) {
    return cached.data as T;
  }
  return null;
}

export function setCachedResponse<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clarityCacheKey(
  platform: string,
  prompt: string,
  model?: string
): string {
  return `clarity:${platform}:${model ?? "default"}:${prompt.trim()}`;
}
