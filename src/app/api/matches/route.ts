import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
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
    const requests = COMPETITIONS.flatMap((code) =>
      STATUSES.map((status) =>
        fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${code}/matches?status=${status}`,
          {
            headers: { "X-Auth-Token": apiKey },
            // Short cache: this list now feeds the Matches page's live-score
            // polling (every 45s), so a full hour of staleness (the old
            // value) would mean scores basically never update. 60s keeps it
            // fresh for that without hammering football-data.org's
            // 10-requests/minute limit - the cache is shared across every
            // visitor, so it's still at most one real request per URL per
            // minute, not one per visitor.
            next: { revalidate: 60 },
          }
        ).then((res) => (res.ok ? res.json() : { matches: [] }))
      )
    );

    const results = await Promise.all(requests);
    const allMatches = results.flatMap((result) => result.matches ?? []);

    return NextResponse.json({ matches: allMatches });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
