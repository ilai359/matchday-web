import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";
import { COMPETITIONS } from "@/lib/competitions";

// Runs once a day (see vercel.json) to pre-load match-history data into
// the shared cache BEFORE any real visitor asks for it - so instead of
// the first visitor of the hour being the one who triggers a live
// football-data.org request (and occasionally hitting its 10-requests/
// minute shared rate limit), the answer is usually already sitting there
// ready to go. This doesn't change what gets served, just who "pays" for
// the first fetch - a quiet background job instead of a real visitor.
//
// Vercel's Hobby (free) plan only allows cron jobs to run once a day, so
// this can't keep the current season's 1-hour cache warm around the
// clock - only right after it runs. Past seasons barely matter here since
// they're cached for 30 days and never change once finished, so warming
// them daily keeps them permanently warm in practice. The current season
// still has hours later in the day where its cache can go cold again;
// that gap is already handled gracefully by finished-matches/route.ts
// (failed fetches are retried and never cached, so the worst case is a
// rare, brief hiccup for one visitor, not a lasting broken page).
//
// Allows up to 5 minutes (Vercel Hobby's max) since this makes ~24
// requests (8 competitions x 3 seasons) spaced out to stay well under
// football-data.org's rate limit, which takes a couple of minutes.
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

  return NextResponse.json({ warmed: results });
}
