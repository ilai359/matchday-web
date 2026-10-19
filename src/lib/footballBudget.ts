import { Redis } from "@upstash/redis";

// football-data.org's free plan allows 10 requests a minute - for the
// WHOLE app, shared by every person using it. Going over that doesn't
// just fail the one extra request: football-data answers "too many
// requests" to everything for the rest of the minute, so one busy moment
// (a few people opening the app at once, a fresh cache with nothing
// saved yet) used to knock out tables, form and head-to-head for
// everybody at the same time.
//
// This keeps a shared count of requests made this minute (in Redis, so
// every server instance sees the same number) and refuses to start a
// new one once the minute's allowance is used up. A refused request
// isn't an error the person sees: the cache serves the last saved copy
// instead (see getOrSet in cache.ts), and the fresh copy is fetched a
// moment later once there's room again.

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken, retry: { retries: 0, backoff: () => 0 } })
    : null;

// One under football-data's limit, leaving a little room for timing
// differences between their clock and ours.
const MAX_PER_MINUTE = 9;
const BLOCKED_KEY = "fd:blocked-until";

// Local copy of "blocked until" so a server that already knows the limit
// is used up doesn't need to ask Redis again.
let blockedUntilLocal = 0;

// How many football-data.org requests this server has started - lets the
// warm-up job tell "already saved" apart from "had to fetch it".
let callsStarted = 0;
export function footballDataCallsStarted(): number {
  return callsStarted;
}

export class FootballDataBusyError extends Error {
  constructor() {
    super("football-data.org request allowance for this minute is used up");
    this.name = "FootballDataBusyError";
  }
}

export function isFootballDataUrl(url: string): boolean {
  return url.includes("api.football-data.org");
}

/**
 * Call before every request to football-data.org. Throws
 * FootballDataBusyError if this minute's allowance is already used up.
 * If Redis can't be reached, lets the request through rather than
 * blocking everything.
 */
export async function reserveFootballDataCall(): Promise<void> {
  const now = Date.now();
  if (now < blockedUntilLocal) throw new FootballDataBusyError();
  callsStarted++;
  if (!redis) return;
  try {
    const minute = Math.floor(now / 60_000);
    const key = `fd:count:${minute}`;
    // One round trip: read the "blocked" marker and count this request.
    const [blockedUntil, count] = await Promise.all([
      redis.get<number>(BLOCKED_KEY),
      redis.incr(key),
    ]);
    if (count === 1) {
      // First request this minute - let the counter clean itself up.
      redis.expire(key, 90).catch(() => {});
    }
    if (typeof blockedUntil === "number" && now < blockedUntil) {
      blockedUntilLocal = blockedUntil;
      throw new FootballDataBusyError();
    }
    if (count > MAX_PER_MINUTE) {
      blockedUntilLocal = (minute + 1) * 60_000;
      throw new FootballDataBusyError();
    }
  } catch (error) {
    if (error instanceof FootballDataBusyError) throw error;
    // Redis trouble: don't let it block the data itself.
  }
}

/**
 * Call with every response from football-data.org. It tells us how many
 * requests are left this minute and when the count resets - if it's
 * about to run out (or already has, a 429), everyone holds off until the
 * reset instead of piling more requests onto a limit that's used up.
 */
export async function noteFootballDataResponse(response: Response): Promise<void> {
  const left = Number(response.headers.get("X-Requests-Available-Minute"));
  const resetSeconds = Number(response.headers.get("X-RequestCounter-Reset"));
  const outOfRequests =
    response.status === 429 || (Number.isFinite(left) && response.headers.has("X-Requests-Available-Minute") && left <= 0);
  if (!outOfRequests) return;
  const waitMs =
    Number.isFinite(resetSeconds) && resetSeconds > 0
      ? Math.min(resetSeconds, 60) * 1000
      : 60_000;
  const until = Date.now() + waitMs;
  blockedUntilLocal = Math.max(blockedUntilLocal, until);
  if (!redis) return;
  try {
    await redis.set(BLOCKED_KEY, until, { px: waitMs + 1000 });
  } catch {
    // Best-effort.
  }
}
