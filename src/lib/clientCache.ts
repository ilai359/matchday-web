// A small in-memory cache that lives only in the browser tab, for as long
// as the page stays open - not shared with the server, not persisted, and
// completely separate from the Redis cache used server-side in the API
// routes. Its only job is to make navigating into a page (like a club's
// page) feel instant when we already have fresh-enough data for it,
// instead of every click re-asking the network for the same thing.
//
// Callers that want to "warm" this cache a moment before someone actually
// navigates (e.g. on hover or touch of a link) just call the same
// cachedFetch-wrapped function early and ignore/catch its result - see
// prefetchClubPage in footballApi.ts for the real example.

type Entry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, Entry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Returns a cached value for `key` if it's still fresh. Otherwise calls
 * `fetcher()` - or, if a fetch for this exact key is already in flight
 * (e.g. a hover warm-up that hasn't finished yet), waits for that instead
 * of starting a second one - stores the result for `ttlMs`, and returns
 * it.
 */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = (async () => {
    try {
      const value = await fetcher();
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}
