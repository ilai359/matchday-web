// The free news API we use (NewsData.io's "latest" endpoint) only ever
// returns articles from the last 48 hours, no matter how often we ask or
// what plan we're on - that's a hard limit of the service itself, not
// something request parameters can change (confirmed against NewsData's
// own docs while investigating why the app only ever showed "up to
// yesterday"). Paying for their Archive API to look back further starts
// at $199.99/month, way more than this project needs.
//
// But every ~3 hours (see fetchNewsWithRetry in the news route) we ask
// NewsData for whatever's fresh, and there's nothing stopping us from
// remembering what we've already seen. This keeps a small running
// archive per search term (a club or league name) in Redis: each fetch
// merges its fresh results into whatever's already remembered, drops
// duplicates (by link) and anything past MAX_AGE, and saves that back.
// So the app's effective news window slowly grows past 48 hours purely
// from fetches it was already making anyway, at no extra API cost.
//
// Same Redis-or-in-memory-fallback approach as cache.ts, kept separate
// here since this is a merge-and-prune operation, not a simple
// get-or-fetch one.

import { Redis } from "@upstash/redis";

// 48 hours of real API coverage plus "another 2 days" of remembered
// history, per Ilai's request - 4 days total.
const MAX_AGE_MS = 4 * 24 * 60 * 60 * 1000;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// In-memory fallback for local dev without Redis configured - fine for a
// single process, just not shared across server instances (same caveat
// as cache.ts).
const memoryStore = new Map<string, unknown[]>();

type MinimalArticle = {
  link?: string;
  pubDate?: string;
};

function archiveKey(query: string): string {
  return `news-archive:${query.toLowerCase()}`;
}

function isFreshEnough(article: MinimalArticle, now: number): boolean {
  if (!article.pubDate) return false;
  const publishedAt = new Date(`${article.pubDate.replace(" ", "T")}Z`).getTime();
  if (Number.isNaN(publishedAt)) return false;
  return now - publishedAt <= MAX_AGE_MS;
}

/**
 * Merges `freshArticles` (this fetch's results for `query`) into
 * whatever was previously remembered for that same query, drops
 * duplicate links and anything older than MAX_AGE_MS, saves the merged
 * result, and returns it. Best-effort: if Redis has a hiccup, this falls
 * back to just returning `freshArticles` unchanged rather than failing
 * the whole news request over a remembering feature.
 */
export async function rememberArticles<T extends MinimalArticle>(
  query: string,
  freshArticles: T[]
): Promise<T[]> {
  const key = archiveKey(query);
  const now = Date.now();

  let previous: T[] = [];
  try {
    if (redis) {
      previous = (await redis.get<T[]>(key)) ?? [];
    } else {
      previous = (memoryStore.get(key) as T[] | undefined) ?? [];
    }
  } catch (error) {
    console.error(`rememberArticles: failed to read archive for "${query}"`, error);
  }

  const byLink = new Map<string, T>();
  for (const article of [...previous, ...freshArticles]) {
    if (!article.link || !isFreshEnough(article, now)) continue;
    byLink.set(article.link, article);
  }
  const merged = Array.from(byLink.values());

  try {
    if (redis) {
      // No TTL needed - isFreshEnough already prunes anything past
      // MAX_AGE_MS on every read, so this can't grow unbounded even
      // without one.
      await redis.set(key, merged);
    } else {
      memoryStore.set(key, merged);
    }
  } catch (error) {
    console.error(`rememberArticles: failed to save archive for "${query}"`, error);
  }

  return merged;
}
