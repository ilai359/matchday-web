import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition");
  const season = searchParams.get("season");
  if (!competition) {
    return NextResponse.json({ error: "Missing competition code" }, { status: 400 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const seasonParam = season ? `&season=${season}` : "";

    const now = new Date();
    const currentSeasonYear =
      now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    const isCurrentSeason = !season || Number(season) === currentSeasonYear;
    // Past seasons never change once they're over, so they're cached much
    // longer than the current season (which still gets new results added).
    const ttlMs = isCurrentSeason ? 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

    // Cache key includes the competition and season so each combination
    // (e.g. BL1/2025 vs PL/2024) gets its own independent cache entry.
    const cacheKey = `finished-matches:${competition}:${season ?? "current"}`;

    // Using getOrSet (Redis-backed, shared across every visitor and every
    // server instance) instead of Next.js's own `fetch`/`next.revalidate`
    // cache. That matters here specifically: Next's fetch cache isn't
    // documented to skip caching failed/non-OK responses, so a request
    // that happened to land during a football-data.org rate limit (429)
    // could get that failure cached for the full TTL - up to 30 days for
    // a past season - meaning the broken "no matches" result would keep
    // getting served long after the rate limit itself had cleared.
    // getOrSet explicitly never caches a failed fetcher call, so a 429 is
    // never stored - only a real successful result is, and a failure just
    // means the next request tries again fresh.
    const data = await getOrSet(cacheKey, ttlMs, async () => {
      const response = await fetchWithRetry(
        `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED${seasonParam}`,
        {
          headers: { "X-Auth-Token": apiKey },
          // We're doing our own caching above, so tell Next.js not to
          // also cache this fetch itself - avoids the exact failure-
          // caching risk described above, and avoids two caches with two
          // different lifetimes disagreeing with each other.
          cache: "no-store",
        }
      );
      if (!response.ok) {
        throw new Error(`football-data.org returned ${response.status}`);
      }
      return response.json();
    });

    return NextResponse.json(data);
  } catch (error) {
    // Logged so a real failure (as opposed to the Redis hiccups getOrSet
    // now recovers from on its own) is visible in Vercel's Logs with its
    // actual cause, not just a generic 500 with no trail to follow.
    console.error(
      `finished-matches failed for competition=${competition} season=${season}`,
      error
    );
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
