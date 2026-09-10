/**
 * Very small in-memory TTL cache with in-flight request coalescing.
 *
 * Used to share expensive/rate-limited upstream calls (right now, just
 * the Claude relevance/summary call in news-relevance) across every
 * visitor requesting the same thing, instead of each visitor paying for
 * and waiting on their own separate call.
 *
 * Coalescing matters as much as the TTL does: without it, if several
 * visitors ask for the same thing within the same few milliseconds, all
 * of them would see an empty cache and all of them would fire off their
 * own upstream call before any of them finished — exactly the
 * multiplication problem this cache exists to prevent. Storing the
 * in-flight promise (not just the resolved value) closes that gap: later
 * callers await the same promise instead of starting a new call.
 *
 * IMPORTANT: this cache lives in the memory of a single running server
 * process. That's fine for a single persistent server (a single Node
 * process, e.g. one Render/Railway instance, or `next start` on one
 * machine) but it will NOT be shared across multiple server instances or
 * serverless cold starts (e.g. Vercel functions scaled out). If this app
 * is ever deployed that way, swap this out for a shared store like Redis
 * (Upstash has a free tier with a very similar get/set API) — call sites
 * wouldn't need to change much, only the implementation of getOrSet below.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

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
  const now = Date.now();
  const existing = store.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = (async () => {
    try {
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

/** Exposed for tests / debugging only. */
export function _clearCacheForTests() {
  store.clear();
  inFlight.clear();
}
