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
    // Using the shared Redis cache (getOrSet) instead of Next's own fetch
    // cache. This matters here specifically: Next's fetch cache has no
    // fallback if a live request happens to land during football-data.org's
    // shared 10-requests/minute rate limit - it just fails and the league
    // table shows nothing. getOrSet instead serves the last known-good
    // table in that case (a rate limit clears within about a minute, so a
    // table that's a minute stale beats a blank one), and never caches the
    // failure itself. Same fix already applied to finished-matches and
    // team-info for the same reason.
    const data = await getOrSet(
      `standings:${competition}`,
      5 * 60 * 1000,
      async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${competition}/standings`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return response.json();
      }
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error(`standings failed for competition=${competition}`, error);
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
