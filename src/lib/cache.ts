/**
 * Small TTL cache with in-flight request coalescing.
 *
 * Used to share expensive/rate-limited upstream calls (the Claude
 * relevance/summary call in news-relevance, team info, and finished-match
 * history) across every visitor requesting the same thing, instead of
 * each visitor paying for and waiting on their own separate call.
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
 * Redis itself is treated as best-effort, not load-bearing: if a Redis
 * call errors for any reason (a bad token, a dropped connection, a
 * momentary Upstash hiccup - anything), that error is caught and logged,
 * and the request falls through to fetching the real data directly
 * instead of failing outright. A caching layer having a bad moment should
 * make a response slightly slower, never turn a working feature into a
 * broken page. This was a real bug found on 2026-09-22: intermittent
 * Redis errors were surfacing as complete failures (500s, empty "no
 * matches" states) even though the underlying data was fetching fine.
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
 *
 * Redis reads/writes are wrapped separately so a Redis-side failure never
 * takes the whole call down - see the module comment above for why.
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
        try {
          const cached = await redis.get<T>(key);
          if (cached !== null && cached !== undefined) {
            return cached;
          }
        } catch (redisError) {
          // Reading the cache failed - not fatal, just means we can't
          // skip the real fetch this time. Logged so this is visible in
          // Vercel's Logs instead of only showing up as a generic 500
          // with no clue why.
          console.error(
            `getOrSet: Redis GET failed for key "${key}", fetching directly instead`,
            redisError
          );
        }

        const value = await fetcher();

        try {
          // px = expiry in milliseconds from now.
          await redis.set(key, value as unknown, { px: ttlMs });
        } catch (redisError) {
          // Failing to SAVE the result isn't worth failing the request
          // over either - the visitor still gets their data, it just
          // won't be cached for the next visitor this time.
          console.error(
            `getOrSet: Redis SET failed for key "${key}", continuing without caching`,
            redisError
          );
        }

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
