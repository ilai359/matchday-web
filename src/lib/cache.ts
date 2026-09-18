/**
 * Small TTL cache with in-flight request coalescing.
 *
 * Used to share expensive/rate-limited upstream calls (right now, just
 * the Claude relevance/summary call in news-relevance) across every
 * visitor requesting the same thing, instead of each visitor paying for
 * and waiting on their own separate call.
 *
 * Backing store: if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are set (see Vercel/​.env.local), this uses Upstash Redis, a small
 * shared store that every server instance can read and write. That's
 * required on Vercel, where each request can land on a different,
 * short-lived server process — a plain in-memory cache would look empty
 * to most requests and silently stop doing its job.
 *
 * If those env vars are NOT set (e.g. running locally without Upstash
 * configured), this falls back to a plain in-memory Map. That's fine for
 * local development (a single process), but note it behaves like the old
 * cache: not shared across multiple instances.
 *
 * In-flight coalescing still happens in-process either way: if several
 * requests on the *same* running server ask for the same key within the
 * same few milliseconds, only the first actually calls `fetcher` — the
 * rest await that same promise instead of starting their own call.
 */

import { Redis } from "@upstash/redis";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

/**
 * Returns a cached value for `key` if it hasn't expired yet. Otherwise
 * calls `fetcher` — coalescing concurrent calls for the same key into a
 * single upstream request — stores the result for `ttlMs` milliseconds,
 * and returns it. A failed `fetcher` call is never cached, so the next
 * request (even moments later) gets a fresh attempt rather than being
 * stuck replaying a rejected promise or a cached failure.
 */
export async function getOrSet<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = (async () => {
    try {
      if (redis) {
        const cached = await redis.get<T>(key);
        if (cached !== null && cached !== undefined) {
          return cached;
        }

        const value = await fetcher();
        // px = expiry in milliseconds from now.
        await redis.set(key, value as unknown, { px: ttlMs });
        return value;
      }

      const now = Date.now();
      const existing = store.get(key);
      if (existing && existing.expiresAt > now) {
        return existing.value as T;
      }

      const value = await fetcher();
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

/** Exposed for tests / debugging only. Only clears the in-memory fallback. */
export function _clearCacheForTests() {
  store.clear();
  inFlight.clear();
}
