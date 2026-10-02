// Tracks which matches the background notification job
// (src/app/api/cron/check-goals/route.ts) has already sent a "starting
// soon", "kickoff", or "full-time" alert for, so none of those three
// get sent twice:
// - "started" = seen in the live list at least once (tells a match
//   being seen live for the first time, worth a kickoff alert, apart
//   from one already known to be underway - and later, its absence
//   from the live list is the signal it just finished).
// - "reminded" = already sent the ~15-minutes-before alert for a
//   scheduled match, so it doesn't repeat every few minutes while
//   still inside that window.
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
const memoryReminded = new Set<string>();

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

const REMINDED_INDEX_KEY = "goalwatch:reminded-ids";

/** Every match id that's already had its "starting soon" reminder sent, so it isn't sent twice. */
export async function getRemindedMatchIds(): Promise<Set<string>> {
  if (redis) {
    try {
      const ids = await redis.smembers(REMINDED_INDEX_KEY);
      return new Set(ids);
    } catch (error) {
      console.error("getRemindedMatchIds: Redis read failed", error);
      return new Set();
    }
  }
  return new Set(memoryReminded);
}

/** Marks a match as having had its "starting soon" reminder sent. */
export async function markMatchReminded(matchId: string): Promise<void> {
  if (redis) {
    try {
      await redis.sadd(REMINDED_INDEX_KEY, matchId);
      return;
    } catch (error) {
      console.error("markMatchReminded: Redis write failed, using in-memory fallback", error);
    }
  }
  memoryReminded.add(matchId);
}

/** Clears a match's reminded flag - called once it actually kicks off, just to keep this list from growing forever with matches that have already come and gone. */
export async function clearMatchReminded(matchId: string): Promise<void> {
  if (redis) {
    try {
      await redis.srem(REMINDED_INDEX_KEY, matchId);
      return;
    } catch (error) {
      console.error("clearMatchReminded: Redis write failed", error);
    }
  }
  memoryReminded.delete(matchId);
}
