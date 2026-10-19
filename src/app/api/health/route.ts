import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Quick "is everything the app depends on actually working right now?"
// check, for when screens come up empty: tests the cache (Upstash Redis),
// football-data.org and the news source directly, and reports each
// one's status, how long it took and - for football-data.org - how many
// requests are left in the current minute. Gated behind the same secret
// as /api/push/test: /api/health?secret=...
export const dynamic = "force-dynamic";

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; value?: T; error?: string }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { ms: Date.now() - start, value };
  } catch (error) {
    return { ms: Date.now() - start, error: String(error) };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (!process.env.GOALS_CRON_SECRET || searchParams.get("secret") !== process.env.GOALS_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report: Record<string, unknown> = { checkedAt: new Date().toISOString() };

  // Cache (Upstash Redis). No automatic retries here, so a failing cache
  // shows up as an error straight away instead of a long wait.
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    report.cache = { ok: false, error: "not configured" };
  } else {
    const redis = new Redis({ url: redisUrl, token: redisToken, retry: { retries: 0 } });
    const result = await timed(async () => {
      await redis.set("health:ping", Date.now(), { ex: 60 });
      return redis.get("health:ping");
    });
    report.cache = { ok: !result.error, ms: result.ms, error: result.error };
  }

  // football-data.org - the source for every match, table and club page.
  const footballKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!footballKey) {
    report.footballData = { ok: false, error: "FOOTBALL_DATA_API_KEY not set" };
  } else {
    const result = await timed(async () => {
      const response = await fetch(
        "https://api.football-data.org/v4/competitions/PL/matches?status=LIVE",
        { headers: { "X-Auth-Token": footballKey }, cache: "no-store" }
      );
      return {
        status: response.status,
        requestsLeftThisMinute: response.headers.get("x-requests-available-minute"),
        body: response.ok ? undefined : (await response.text()).slice(0, 300),
      };
    });
    report.footballData = {
      ok: !result.error && result.value?.status === 200,
      ms: result.ms,
      ...result.value,
      error: result.error,
    };
  }

  // News source (Updates tab).
  const newsKey = process.env.NEWS_DATA_API_KEY;
  if (!newsKey) {
    report.news = { ok: false, error: "NEWS_DATA_API_KEY not set" };
  } else {
    const result = await timed(async () => {
      const response = await fetch(
        `https://newsdata.io/api/1/latest?apikey=${newsKey}&q=football&language=en&category=sports&size=1`,
        { cache: "no-store" }
      );
      return { status: response.status, body: response.ok ? undefined : (await response.text()).slice(0, 300) };
    });
    report.news = { ok: !result.error && result.value?.status === 200, ms: result.ms, ...result.value, error: result.error };
  }

  return NextResponse.json(report);
}
