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

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    // Each competition+status combo is its own getOrSet entry so one
    // rate-limited request doesn't take the rest down with it, and each
    // one falls back to its own last known-good list instead of an empty
    // one - this is what used to make only *some* leagues' matches show
    // up on a given page load.
    const requests = COMPETITIONS.flatMap((code) =>
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
