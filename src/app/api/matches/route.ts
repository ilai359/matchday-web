import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";
import { COMPETITIONS } from "@/lib/competitions";

// football-data.org's docs only ever show a single status value in their
// examples (e.g. "?status=FINISHED"), so combining values in one request
// (like "SCHEDULED,LIVE") isn't something their docs confirm works. Rather
// than guess at undocumented syntax, we just ask for each status
// separately and merge the results - two confirmed-working requests per
// competition instead of one unconfirmed one. LIVE is their pseudo-status
// that covers both IN_PLAY and PAUSED, so this is what actually makes live
// matches show up (they were being silently dropped before, since
// SCHEDULED alone excludes them).
const STATUSES = ["SCHEDULED", "LIVE"];

export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  // Only ask football-data.org for the leagues someone's actually
  // watching (their followed clubs' leagues), instead of always asking
  // for all 8. This route used to fire 16 requests (8 competitions x 2
  // statuses) on every refresh no matter who was looking - by far the
  // single biggest source of hitting football-data.org's shared
  // 10-requests/minute limit. Most people only follow clubs in 2-4
  // leagues, so this typically cuts that in half or more.
  //
  // "leagues" present but empty means the caller genuinely has nothing
  // to ask for yet (e.g. no clubs followed) - fetch nothing. "leagues"
  // missing entirely (an older cached page that doesn't send it yet, or
  // a direct call) falls back to the full list, so nothing breaks.
  const { searchParams } = new URL(request.url);
  const leaguesParam = searchParams.get("leagues");
  const requestedCompetitions =
    leaguesParam === null
      ? COMPETITIONS
      : leaguesParam
          .split(",")
          .map((code) => code.trim())
          .filter((code) => COMPETITIONS.includes(code));

  try {
    // Each competition+status combo is its own getOrSet entry so one
    // rate-limited request doesn't take the rest down with it, and each
    // one falls back to its own last known-good list instead of an empty
    // one - this is what used to make only *some* leagues' matches show
    // up on a given page load.
    const requests = requestedCompetitions.flatMap((code) =>
      STATUSES.map((status) =>
        getOrSet(
          `matches:${code}:${status}`,
          60 * 1000,
          async () => {
            const response = await fetchWithRetry(
              `https://api.football-data.org/v4/competitions/${code}/matches?status=${status}`,
              { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
            );
            if (!response.ok) {
              throw new Error(`football-data.org returned ${response.status}`);
            }
            return response.json();
          }
        ).catch(() => ({ matches: [] }))
      )
    );

    const results = await Promise.all(requests);
    const allMatches = results.flatMap(
      (result) => (result as { matches?: unknown[] }).matches ?? []
    );

    return NextResponse.json({ matches: allMatches });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
