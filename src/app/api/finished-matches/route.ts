import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

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

    // A finished season's results are permanent - Augsburg 2-1 Bayern from
    // last season is never going to change. Caching those for the same 1
    // hour as everything else meant we were re-fetching identical,
    // never-changing data from football-data.org every single hour,
    // burning through their shared 10-requests/minute free-tier limit for
    // no reason - which is exactly what was causing real 429s (confirmed
    // live against the deployed site, not assumed) and, in turn, Form and
    // Head-to-head coming up empty. Only the CURRENT season's results can
    // still change (new matches get played), so that's the only one that
    // still needs a short cache; anything older is cached for 30 days.
    // European club seasons run roughly July-June, matching the same
    // cutoff the match page itself uses to work out "current season".
    const now = new Date();
    const currentSeasonYear =
      now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    const isCurrentSeason = !season || Number(season) === currentSeasonYear;
    const revalidateSeconds = isCurrentSeason ? 3600 : 60 * 60 * 24 * 30;

    const response = await fetchWithRetry(
      `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED${seasonParam}`,
      { headers: { "X-Auth-Token": apiKey }, next: { revalidate: revalidateSeconds } }
    );
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch finished matches" }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong", details: String(error) }, { status: 500 });
  }
}
