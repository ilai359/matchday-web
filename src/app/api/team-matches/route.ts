import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";

export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing team id" }, { status: 400 });
  }
  try {
    // Upcoming fixtures barely change either (a new one only appears
    // when a competition schedules it), so - same as standings and
    // finished-matches - this is shared across every visitor via Redis
    // with a stale-if-error fallback, instead of each club page's visit
    // risking its own football-data.org rate-limit failure with nothing
    // to fall back on.
    const cacheKey = `team-matches:${id}`;
    const ttlMs = 60 * 60 * 1000;

    const data = await getOrSet(cacheKey, ttlMs, async () => {
      const response = await fetchWithRetry(
        `https://api.football-data.org/v4/teams/${id}/matches?status=SCHEDULED`,
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
    console.error(`team-matches failed for id=${id}`, error);
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
