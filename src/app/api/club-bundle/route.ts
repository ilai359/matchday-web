import { NextResponse } from "next/server";
import { getStandings } from "@/lib/standingsData";
import { getScorers } from "@/lib/scorersData";
import { getFinishedMatches } from "@/lib/finishedMatchesData";
import { getMatches } from "@/lib/matchesData";

// Runs on Vercel's Edge Runtime - see the other API routes for why.
export const runtime = "edge";

// The Club detail page needs five separate pieces of data (standings,
// scorers, this club's finished matches, Champions League finished
// matches, and upcoming/live matches) to render. It used to fire five
// separate requests to five separate routes for this, each one its own
// round trip from the browser. This route does the exact same five
// lookups - reusing the exact same shared lib functions (and therefore
// the exact same cache keys/TTLs) the standalone routes use, so nothing
// about caching behavior changes - in one request instead, cutting the
// Club page's data fetch down to this plus one remaining call (news,
// which already has its own separate caching/pre-warming pipeline and
// isn't worth coupling in here).
//
// `code` is this club's own competition code (e.g. "PL") - omitted for a
// club outside the leagues this app tracks, in which case standings/
// scorers/recentMatches are all skipped (there's nothing to ask for),
// matching what the Club page already did before this existed.
export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const season = searchParams.get("season");

  // Every club's own league, plus Champions League - a club that's
  // actually in it should see those fixtures/results too (same as
  // before this existed).
  const leagueCodes = code ? Array.from(new Set([code, "CL"])) : [];

  const [standings, scorers, recentMatches, recentMatchesCL, upcoming] =
    await Promise.all([
      code ? getStandings(code, apiKey).catch(() => null) : Promise.resolve(null),
      code ? getScorers(code, apiKey).catch(() => null) : Promise.resolve(null),
      code
        ? getFinishedMatches(code, season, apiKey).catch(() => null)
        : Promise.resolve(null),
      code
        ? getFinishedMatches("CL", season, apiKey).catch(() => null)
        : Promise.resolve(null),
      getMatches(leagueCodes, apiKey).catch(() => ({ matches: [] })),
    ]);

  return NextResponse.json({
    standings,
    scorers,
    recentMatches,
    recentMatchesCL,
    upcoming,
  });
}
