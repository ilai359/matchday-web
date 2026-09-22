/**
 * Small TTL cache with in-flight request coalescing, plus a stale-if-error
 * fallback.
 *
 * Used to share expensive/rate-limited upstream calls (the Claude
 * relevance/summary call in news-relevance, team info, and finished-match
 * history) across every visitor requesting the same thing, instead of
 * each visitor paying for and waiting on their own separate call.
 *
 * Backing store: if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are set (see Vercel/.env.local), this uses Upstash Redis, a small
 * shared store that every server instance can read and write. That's
 * required on Vercel, where each request can land on a different,
 * short-lived server process - a plain in-memory cache would look empty
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
 * instead of failing outright. This was a real bug found on 2026-09-22:
 * intermittent Redis errors were surfacing as complete failures (500s,
 * empty "no matches" states) even though the underlying data was
 * fetching fine.
 *
 * Stale-if-error fallback: every successful fetch is also saved under a
 * second key with no expiry ("last known good"). If a live fetch fails
 * for any reason - most commonly football-data.org's shared 10
 * requests/minute rate limit being hit by a burst of traffic - instead
 * of showing a broken page, we serve that last known good value even
 * though it's stale. A slightly out-of-date result (the data a
 * competition's finished matches - which rarely changes minute to
 * minute anyway) is far better than an error, and a rate limit clears
 * itself within about a minute on its own. Found and added the same day
 * as the Redis fix above, once it became clear Redis wasn't the only
 * thing that could make a request fail.
 *
 * In-flight coalescing still happens in-process either way: if several
 * requests on the *same* running server ask for the same key within the
 * same few milliseconds, only the first actually calls `fetcher` - the
 * rest await that same promise instead of starting their own call.
 */

import { Redis } from "@upstash/redis";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
// Last known good value per key, kept around after normal expiry so it can
// be served if a fresh fetch fails. Only used by the in-memory fallback
// path (no Redis configured) - the Redis path keeps its own stale copy in
// Redis itself, under a separate key, so it survives across server
// instances and cold starts too.
const lastGood = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

/**
 * Returns a cached value for `key` if it hasn't expired yet. Otherwise
 * calls `fetcher` - coalescing concurrent calls for the same key into a
 * single upstream request - stores the result for `ttlMs` milliseconds,
 * and returns it.
 *
 * If `fetcher` fails (e.g. the upstream API is rate-limited or down) and
 * we have a previously successful result for this key sitting around,
 * that stale result is returned instead of throwing - see the module
 * comment above for why. Only when there's genuinely no data to fall
 * back on does this actually throw.
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
        // A second, never-expiring copy of the last value that fetched
        // successfully. Consulted only as a fallback when a live fetch
        // fails and the normal (TTL'd) key is empty or expired.
        const staleKey = `stale:${key}`;

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

        try {
          const value = await fetcher();

          try {
            // px = expiry in milliseconds from now.
            await redis.set(key, value as unknown, { px: ttlMs });
            // No px here on purpose - this copy is meant to outlive the
            // normal cache entry, so it's still there to fall back on
            // later even if this key doesn't get refreshed again for a
            // while.
            await redis.set(staleKey, value as unknown);
          } catch (redisError) {
            // Failing to SAVE the result isn't worth failing the request
            // over either - the visitor still gets their data, it just
            // won't be cached for next time.
            console.error(
              `getOrSet: Redis SET failed for key "${key}", continuing without caching`,
              redisError
            );
          }

          return value;
        } catch (fetchError) {
          // The live fetch itself failed - most likely football-data.org's
          // shared rate limit was hit by a burst of traffic. Try to serve
          // the last known good value instead of a broken page.
          try {
            const stale = await redis.get<T>(staleKey);
            if (stale !== null && stale !== undefined) {
              console.error(
                `getOrSet: live fetch failed for key "${key}", serving last known good (stale) value instead`,
                fetchError
              );
              return stale;
            }
          } catch (redisError) {
            console.error(
              `getOrSet: Redis GET (stale fallback) failed for key "${key}"`,
              redisError
            );
          }
          // No fresh data and no stale fallback either - genuinely
          // nothing to serve.
          throw fetchError;
        }
      }

      const now = Date.now();
      const existing = store.get(key);
      if (existing && existing.expiresAt > now) {
        return existing.value as T;
      }

      try {
        const value = await fetcher();
        store.set(key, { value, expiresAt: Date.now() + ttlMs });
        lastGood.set(key, value);
        return value;
      } catch (fetchError) {
        if (lastGood.has(key)) {
          console.error(
            `getOrSet: live fetch failed for key "${key}", serving last known good (stale) value instead`,
            fetchError
          );
          return lastGood.get(key) as T;
        }
        throw fetchError;
      }
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
  lastGood.clear();
  inFlight.clear();
}
