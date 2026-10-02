// Tracks which live matches the background notification job
// (src/app/api/cron/check-goals/route.ts) has already sent a "kickoff"
// alert for, so it can tell apart a match it's seeing live for the
// first time (send a kickoff notification) from one it's already
// notified about (don't repeat it), and can notice when a match it was
// tracking has since disappeared from the live list (that's the signal
// a match just finished, so it's time to look up the final score and
// send the full-time notification).
//
// This deliberately does NOT track in-play scores or try to notify on
// individual goals anymore - football-data.org's free plan delays live
// scores during play (see NOTES.md), so a goal-by-goal alert could be
// minutes behind the real thing. Kickoff and full-time are each a
// single clean check instead, with full-time's score coming from a
// fresh single-match lookup at the moment the match is confirmed over
// - no running tally that can drift out of sync.
//
// Same Redis-backed-with-in-memory-fallback shape as cache.ts, for the
// same reason: Vercel can run each request on a different process, so
// only Redis is reliably shared between one check and the next.

import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const memoryStarted = new Set<string>();

const STARTED_INDEX_KEY = "goalwatch:started-ids";

/** Every match id currently being tracked as "kicked off, not yet confirmed finished". */
export async function getStartedMatchIds(): Promise<Set<string>> {
  if (redis) {
    try {
      const ids = await redis.smembers(STARTED_INDEX_KEY);
      return new Set(ids);
    } catch (error) {
      console.error("getStartedMatchIds: Redis read failed", error);
      return new Set();
    }
  }
  return new Set(memoryStarted);
}

/** Marks a match as kicked off (so its kickoff alert doesn't repeat, and so a later run can notice when it disappears from the live list). */
export async function markMatchStarted(matchId: string): Promise<void> {
  if (redis) {
    try {
      await redis.sadd(STARTED_INDEX_KEY, matchId);
      return;
    } catch (error) {
      console.error("markMatchStarted: Redis write failed, using in-memory fallback", error);
    }
  }
  memoryStarted.add(matchId);
}

/** Stops tracking a match - called once its full-time alert has been sent (or it turned out to be postponed/abandoned rather than finished). */
export async function clearMatchStarted(matchId: string): Promise<void> {
  if (redis) {
    try {
      await redis.srem(STARTED_INDEX_KEY, matchId);
      return;
    } catch (error) {
      console.error("clearMatchStarted: Redis write failed", error);
    }
  }
  memoryStarted.delete(matchId);
}
