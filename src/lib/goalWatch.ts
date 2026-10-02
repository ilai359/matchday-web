// Remembers the last score seen for each live match, so the background
// goal-check job (src/app/api/cron/check-goals/route.ts) can tell "this
// match's score just changed since last time" apart from "this match
// simply has a score" - which it needs in order to only notify people
// once per actual goal, not on every single check.
//
// Same Redis-backed-with-in-memory-fallback shape as cache.ts, for the
// same reason: Vercel can run each request on a different process, so
// only Redis is reliably shared between one check and the next. Unlike
// cache.ts this isn't a performance cache (nothing here is expensive to
// recompute) - it's just the one piece of state this feature needs to
// remember between runs.

import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const memory = new Map<string, LastScore>();

export type LastScore = { homeScore: number; awayScore: number };

/** The score this match had the last time it was checked, or null if this is the first time we've seen it. */
export async function getLastScore(matchId: string): Promise<LastScore | null> {
  if (redis) {
    try {
      const value = await redis.get<LastScore>(`goalwatch:${matchId}`);
      return value ?? null;
    } catch (error) {
      console.error("getLastScore: Redis read failed", error);
      return null;
    }
  }
  return memory.get(matchId) ?? null;
}

export async function setLastScore(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const value: LastScore = { homeScore, awayScore };
  if (redis) {
    try {
      // 6-hour expiry - no match runs anywhere near that long, this just
      // keeps finished matches from piling up here forever.
      await redis.set(`goalwatch:${matchId}`, value, { ex: 6 * 60 * 60 });
      return;
    } catch (error) {
      console.error("setLastScore: Redis write failed, using in-memory fallback", error);
    }
  }
  memory.set(matchId, value);
}
