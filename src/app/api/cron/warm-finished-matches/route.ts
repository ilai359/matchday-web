import { NextResponse } from "next/server";
import { COMPETITIONS } from "@/lib/competitions";
import { getFinishedMatches } from "@/lib/finishedMatchesData";
import { getScorers } from "@/lib/scorersData";
import { getStandings } from "@/lib/standingsData";
import { FootballDataBusyError, footballDataCallsStarted } from "@/lib/footballBudget";

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
  // Only Vercel's own cron trigger (CRON_SECRET) - or someone with the
  // app's alert-check secret, e.g. to fill an empty cache right away -
  // can run this: it makes ~40 real football-data.org requests.
  const authHeader = request.headers.get("authorization");
  const secretParam = new URL(request.url).searchParams.get("secret");
  const allowed =
    (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) ||
    (process.env.GOALS_CRON_SECRET &&
      (authHeader === `Bearer ${process.env.GOALS_CRON_SECRET}` ||
        secretParam === process.env.GOALS_CRON_SECRET));
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const currentSeasonYear = getSeasonStartYear(new Date());

  // Most-viewed first, so if time runs out the important things are done.
  type Task = { label: string; run: () => Promise<unknown> };
  const tasks: Task[] = [];
  for (const competition of COMPETITIONS) {
    tasks.push({ label: `standings ${competition}`, run: () => getStandings(competition, apiKey) });
  }
  for (const competition of COMPETITIONS) {
    tasks.push({ label: `scorers ${competition}`, run: () => getScorers(competition, apiKey) });
  }
  for (const offset of [0, 1, 2]) {
    const season = String(currentSeasonYear - offset);
    for (const competition of COMPETITIONS) {
      tasks.push({
        label: `finished ${competition} ${season}`,
        run: () => getFinishedMatches(competition, season, apiKey),
      });
    }
  }

  const startedAt = Date.now();
  const results: { task: string; status: string }[] = [];
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const task of tasks) {
    // Stop with time to spare before Vercel's 5-minute cut-off - whatever
    // is left gets filled by the next run or by people's visits.
    if (Date.now() - startedAt > 270_000) {
      results.push({ task: task.label, status: "skipped (out of time)" });
      continue;
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const callsBefore = footballDataCallsStarted();
      try {
        await task.run();
        const fetched = footballDataCallsStarted() > callsBefore;
        results.push({ task: task.label, status: fetched ? "fetched" : "already saved" });
        // Only wait after a real request - spacing them out keeps this
        // job from using up the per-minute allowance people need.
        if (fetched) await sleep(7000);
        break;
      } catch (error) {
        if (error instanceof FootballDataBusyError && attempt === 0) {
          // The minute's allowance is used up - wait for it to reset.
          await sleep(20_000);
          continue;
        }
        results.push({ task: task.label, status: `failed: ${String(error)}` });
        break;
      }
    }
  }

  return NextResponse.json({ warmed: results });
}
