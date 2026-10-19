// Remembers each tracked club's last-known league position, competition
// by competition, so the goals cron job (src/app/api/cron/check-goals/
// route.ts) can tell when someone's followed club actually moved up or
// down the table and send a notification for it - rather than having to
// diff anything itself.
//
// Deliberately a single JSON blob per competition (clubId -> position)
// rather than one Redis key per club: there are at most ~20 clubs per
// competition, so one read/write per competition per check is already
// as cheap as this gets, and it keeps "the whole table as of last check"
// easy to compare in one go.
//
// Same Redis-backed shape as goalWatch.ts and pushSubscriptions.ts, for
// the same reason: Vercel can run each request on a different process,
// so only Redis is reliably shared between one check and the next.

import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken, retry: { retries: 1, backoff: () => 100 } }) : null;

const KEY_PREFIX = "table-positions:";

export type PositionMap = Record<string, number>;

/** The league position we last saw for each tracked club in this competition, from the last time the table wasn't mid-match. */
export async function getKnownPositions(competition: string): Promise<PositionMap> {
  if (!redis) return {};
  try {
    const value = await redis.get<PositionMap>(`${KEY_PREFIX}${competition}`);
    return value ?? {};
  } catch (error) {
    console.error("tableWatch: getKnownPositions failed", error);
    return {};
  }
}

/** Saves the full position map for this competition as the new "last known" baseline to compare against next time. */
export async function setKnownPositions(
  competition: string,
  positions: PositionMap
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`${KEY_PREFIX}${competition}`, positions);
  } catch (error) {
    console.error("tableWatch: setKnownPositions failed", error);
  }
}
