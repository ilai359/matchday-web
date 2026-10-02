// Stores and looks up push-notification subscriptions: which devices
// have opted into goal alerts, and which clubs each one should be
// notified about.
//
// Shared storage (Redis), not per-instance memory, for the same reason
// cache.ts uses Redis: Vercel can run any request on a different,
// short-lived server process, so a subscription saved in one process's
// memory would be invisible to the background job that later needs to
// read it back. Unlike cache.ts, there's no in-memory fallback here -
// without Redis configured, push notifications simply can't work (there
// would be nowhere durable to remember who's subscribed), so these
// functions silently no-op instead of pretending to work.
//
// See NOTES.md for the one-time setup this feature needs (VAPID keys,
// environment variables, the GitHub Actions job that checks for goals).

import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushSubscriptionRecord = {
  subscription: StoredPushSubscription;
  clubIds: string[];
};

// A Redis Set holding every subscription's storage key, so the
// background goal-check job can list "every device that's subscribed"
// without having to know their endpoints in advance.
const INDEX_KEY = "push:subs:index";

// Subscription endpoints are long, unique URLs - hashed down to a fixed,
// short Redis key rather than used directly as one.
function keyFor(endpoint: string): string {
  const hash = crypto.createHash("sha256").update(endpoint).digest("hex");
  return `push:sub:${hash}`;
}

/** Saves (or updates, if this device already had one) a push subscription and which clubs it should be notified about. */
export async function saveSubscription(
  subscription: StoredPushSubscription,
  clubIds: string[]
): Promise<void> {
  if (!redis) return;
  const key = keyFor(subscription.endpoint);
  try {
    await redis.set(key, { subscription, clubIds });
    await redis.sadd(INDEX_KEY, key);
  } catch (error) {
    console.error("saveSubscription: Redis write failed", error);
  }
}

/** Removes one device's subscription - called when the user turns notifications off, or when a send to it fails because it's no longer valid. */
export async function removeSubscriptionByEndpoint(endpoint: string): Promise<void> {
  if (!redis) return;
  const key = keyFor(endpoint);
  try {
    await redis.del(key);
    await redis.srem(INDEX_KEY, key);
  } catch (error) {
    console.error("removeSubscriptionByEndpoint: Redis write failed", error);
  }
}

/** Every currently-stored subscription - read by the background job that checks for goals and decides who to notify. */
export async function getAllSubscriptions(): Promise<PushSubscriptionRecord[]> {
  if (!redis) return [];
  try {
    const keys = await redis.smembers(INDEX_KEY);
    if (keys.length === 0) return [];
    const records = await Promise.all(
      keys.map(async (key) => {
        try {
          return await redis.get<PushSubscriptionRecord>(key);
        } catch {
          return null;
        }
      })
    );
    return records.filter((r): r is PushSubscriptionRecord => r !== null);
  } catch (error) {
    console.error("getAllSubscriptions: Redis read failed", error);
    return [];
  }
}
