import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";
import { COMPETITIONS } from "@/lib/competitions";

// Runs once a day (see vercel.json) to pre-load match-history and top
// scorers into the shared cache BEFORE any real visitor asks for them -
// so instead of the first visitor of the hour being the one who triggers
// a live football-data.org request (and occasionally hitting its
// 10-requests/minute shared rate limit), the answer is usually already
// sitting there ready to go. This doesn't change what gets served, just
// who "pays" for the first fetch - a quiet background job instead of a
// real visitor.
//
// Vercel's Hobby (free) plan only allows cron jobs to run once a day
// (confirmed against Vercel's own docs: any more frequent schedule
// simply fails to deploy on Hobby), so this can't keep everything warm
// around the clock the way continuous background polling could on a
// paid plan - only right after it runs each day. How much that one daily
// run actually buys depends on how long each thing stays "fresh" once
// warmed:
//   - Finished-match history for past seasons: cached 30 days and never
//     changes once a season's done, so one warm a day keeps it
//     permanently warm in practice.
//   - Finished-match history for the CURRENT season, and top scorers:
//     cached 1 hour and 6 hours respectively, so this run gives each a
//     meaningful head start on the day but both still go cold again
//     later - handled gracefully either way (failed fetches are retried
//     and never cached, so the worst case is a rare, brief hiccup for
//     one visitor, not a lasting broken page).
//   - Standings (5 min) and live matches (1 min): their TTLs are so
//     short that a once-a-day warm-up barely helps - they're left out of
//     this job entirely and just rely on real visits to stay fresh,
//     which is the honest, working answer for those on a free plan.
//
// Allows up to 5 minutes (Vercel Hobby's max) since this makes ~32
// requests (8 competitions x 3 seasons of finished matches, plus 8
// competitions x 1 scorers request) spaced out to stay well under
// football-data.org's rate limit, which takes a few minutes.
export const maxDuration = 300;

function getSeasonStartYear(date: Date): number {
  // Matches the same season-boundary rule the match and club detail pages
  // use (European club seasons run roughly July-June, so July onward
  // counts as the new season) - this has to line up exactly with what
  // real visitors request, or this job would be warming the wrong cache
  // keys entirely.
  const month = date.getMonth();
  const year = date.getFullYear();
  return month >= 6 ? year : year - 1;
}

export async function GET(request: Request) {
  // Only Vercel's own cron trigger should be able to run this - it makes
  // ~24 real football-data.org requests every time, so a stray bot or
  // crawler hitting this URL repeatedly could burn through the same
  // scarce rate-limit budget this job exists to protect. Vercel
  // automatically sends this header (using the CRON_SECRET environment
  // variable) when it invokes a route listed in vercel.json's crons - see
  // NOTES.md for the one-time setup step this needs in Vercel's project
  // settings.
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const currentSeasonYear = getSeasonStartYear(new Date());
  const seasons = [currentSeasonYear, currentSeasonYear - 1, currentSeasonYear - 2];

  const results: { competition: string; season: number; status: string }[] = [];

  for (const competition of COMPETITIONS) {
    for (const season of seasons) {
      // Must match the cache key format finished-matches/route.ts uses
      // exactly, or a real visitor's request won't find what this job
      // warmed.
      const cacheKey = `finished-matches:${competition}:${season}`;
      const isCurrentSeason = season === currentSeasonYear;
      const ttlMs = isCurrentSeason ? 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

      try {
        await getOrSet(cacheKey, ttlMs, async () => {
          const response = await fetchWithRetry(
            `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED&season=${season}`,
            { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
          );
          if (!response.ok) {
            throw new Error(`football-data.org returned ${response.status}`);
          }
          return response.json();
        });
        results.push({ competition, season, status: "ok" });
      } catch (error) {
        results.push({ competition, season, status: `failed: ${String(error)}` });
      }

      // Spread requests out so this job stays well under
      // football-data.org's 10-requests/minute shared limit - it would be
      // self-defeating for the job meant to avoid that limit to be the
      // thing that trips it.
      await new Promise((resolve) => setTimeout(resolve, 6500));
    }
  }

  // Same idea, now for top scorers - one request per competition, same
  // cache key format scorers/route.ts uses, same spacing.
  for (const competition of COMPETITIONS) {
    const cacheKey = `scorers:${competition}`;

    try {
      await getOrSet(cacheKey, 6 * 60 * 60 * 1000, async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${competition}/scorers?limit=50`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return response.json();
      });
      results.push({ competition, season: 0, status: "ok (scorers)" });
    } catch (error) {
      results.push({ competition, season: 0, status: `failed (scorers): ${String(error)}` });
    }

    await new Promise((resolve) => setTimeout(resolve, 6500));
  }

  return NextResponse.json({ warmed: results });
}
