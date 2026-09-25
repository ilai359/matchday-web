import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";

export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition");
  if (!competition) {
    return NextResponse.json(
      { error: "Missing competition code" },
      { status: 400 }
    );
  }

  try {
    // League tables barely change - only after a match finishes, a
    // handful of times a week - so this is cached hard (30 min) and,
    // same as finished-matches, backed by getOrSet's shared Redis cache
    // with a stale-if-error fallback. Before this, a standings request
    // that landed during football-data.org's shared rate limit just
    // failed outright with no fallback, which is the "No league info
    // available right now" seen on club pages. Now every visitor shares
    // one cached table, and a failed refresh serves the last known good
    // table instead of an error.
    const cacheKey = `standings:${competition}`;
    const ttlMs = 30 * 60 * 1000;

    const data = await getOrSet(cacheKey, ttlMs, async () => {
      const response = await fetchWithRetry(
        `https://api.football-data.org/v4/competitions/${competition}/standings`,
        {
          headers: { "X-Auth-Token": apiKey },
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
    console.error(`standings failed for competition=${competition}`, error);
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
