import { NextResponse } from "next/server";
import webpush from "web-push";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";
import { COMPETITIONS } from "@/lib/competitions";
import { matchClubId } from "@/lib/footballApi";
import {
  getStartedMatchIds,
  markMatchStarted,
  clearMatchStarted,
} from "@/lib/goalWatch";
import { getAllSubscriptions, removeSubscriptionByEndpoint } from "@/lib/pushSubscriptions";

// Runs frequently (every few minutes - see the GitHub Actions workflow
// at .github/workflows/check-goals.yml) and sends two kinds of alert to
// anyone following either club in a match: one when the match kicks
// off, and one when it's over, with the final score.
//
// It deliberately does NOT try to alert on individual goals while a
// match is still being played. football-data.org's free plan delays
// live scores during play (see NOTES.md / the pricing note in this
// repo's notes), so a goal-by-goal alert could lag minutes behind the
// real thing - worse than no alert at all. Kickoff and full-time are
// each a single, low-stakes check: "has this match started" and "has
// this match finished" are reliable even if the score shown mid-match
// isn't.
//
// This can't be Vercel's own cron (see warm-finished-matches/route.ts
// for that mechanism) because Vercel's free Hobby plan only allows cron
// jobs to run once a day - nowhere near fast enough for a kickoff alert
// to still feel like one. GitHub Actions' scheduled workflows are free
// and can run every few minutes instead, so this route is called from
// there, authenticated with its own secret (GOALS_CRON_SECRET) the same
// way the Vercel cron job authenticates with CRON_SECRET.
//
// Deliberately reuses the exact same cache key format
// (`matches:${code}:LIVE`, 60-second TTL) that /api/matches already uses
// for real visitors, so this job only spends its own football-data.org
// request when nobody's looked recently. The one extra request this
// version adds beyond that - a single-match lookup - only happens once
// per match, right when it's confirmed finished, not on every tick.
export const maxDuration = 60;

type RawLiveMatch = {
  id: number;
  competition: { name: string };
  homeTeam: { name: string };
  awayTeam: { name: string };
};

type RawSingleMatch = {
  score?: { fullTime?: { home: number | null; away: number | null } };
  status?: string;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.GOALS_CRON_SECRET ||
    authHeader !== `Bearer ${process.env.GOALS_CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!apiKey || !vapidPublic || !vapidPrivate || !vapidSubject) {
    return NextResponse.json(
      { error: "Missing required environment variables" },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const subscriptions = await getAllSubscriptions();
  let kickoffsSent = 0;
  let fullTimesSent = 0;
  let notificationsSent = 0;

  // Nobody's subscribed yet - nothing to check or send, no point
  // spending football-data.org requests on it.
  if (subscriptions.length === 0) {
    return NextResponse.json({ kickoffsSent, fullTimesSent, notificationsSent, subscribers: 0 });
  }

  async function notifySubscribers(clubIds: string[], title: string, body: string, matchId: string) {
    if (clubIds.length === 0) return;
    const payload = JSON.stringify({ title, body, url: `/match/${matchId}` });
    for (const sub of subscriptions) {
      if (!sub.clubIds.some((id) => clubIds.includes(id))) continue;
      try {
        await webpush.sendNotification(sub.subscription, payload);
        notificationsSent += 1;
      } catch (error) {
        // A 404/410 means this subscription is no longer valid (the
        // user uninstalled, cleared data, or revoked permission) -
        // clean it up so future runs stop wasting time on it. Any
        // other error is logged and otherwise ignored, so one broken
        // subscription can't stop everyone else from being notified.
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscriptionByEndpoint(sub.subscription.endpoint);
        } else {
          console.error("check-goals: sendNotification failed", error);
        }
      }
    }
  }

  const previouslyStarted = await getStartedMatchIds();
  const stillLiveIds = new Set<string>();
  const liveMatchesById = new Map<string, RawLiveMatch>();

  for (const competition of COMPETITIONS) {
    let matches: RawLiveMatch[];
    try {
      matches = await getOrSet(`matches:${competition}:LIVE`, 60 * 1000, async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${competition}/matches?status=LIVE`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        const data = await response.json();
        return (data.matches ?? []) as RawLiveMatch[];
      });
    } catch {
      // This competition's check failed (most likely a rate-limit hit) -
      // skip it this run rather than fail the whole job; it'll be tried
      // again on the next scheduled run a few minutes later. Any match
      // from this competition that was already tracked as started stays
      // tracked (we just didn't see it this run), so it won't falsely
      // trigger a full-time alert either.
      continue;
    }

    for (const match of matches) {
      const matchId = String(match.id);
      stillLiveIds.add(matchId);
      liveMatchesById.set(matchId, match);

      if (previouslyStarted.has(matchId)) continue;

      // First time we've seen this match in the LIVE list - it just
      // kicked off.
      await markMatchStarted(matchId);
      kickoffsSent += 1;

      const homeClubId = matchClubId(match.homeTeam.name);
      const awayClubId = matchClubId(match.awayTeam.name);
      const clubIds = [homeClubId, awayClubId].filter((id): id is string => id !== null);
      await notifySubscribers(
        clubIds,
        `⚽ Kickoff: ${match.homeTeam.name} vs ${match.awayTeam.name}`,
        `${match.competition.name} is underway`,
        matchId
      );
    }

    // Spread requests out so this job stays well under
    // football-data.org's shared rate limit, same spacing used by the
    // other cron job.
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  // Any match that was tracked as started last run, but isn't in any
  // competition's LIVE list this run, has left play - either finished,
  // or postponed/abandoned. Either way, look up its current state once
  // (not repeatedly) to get the real final score and send the full-time
  // alert, then stop tracking it.
  for (const matchId of previouslyStarted) {
    if (stillLiveIds.has(matchId)) continue;

    const liveMatch = liveMatchesById.get(matchId);
    try {
      const single = await getOrSet(`match-live:${matchId}`, 30 * 1000, async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/matches/${matchId}`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return response.json() as Promise<RawSingleMatch>;
      });

      // Only send a full-time alert for a match that's actually
      // finished - not one that was merely postponed, suspended, or
      // cancelled while it happened to be live.
      if (single.status === "FINISHED") {
        const homeScore = single.score?.fullTime?.home ?? null;
        const awayScore = single.score?.fullTime?.away ?? null;
        if (homeScore !== null && awayScore !== null && liveMatch) {
          fullTimesSent += 1;
          const homeClubId = matchClubId(liveMatch.homeTeam.name);
          const awayClubId = matchClubId(liveMatch.awayTeam.name);
          const clubIds = [homeClubId, awayClubId].filter((id): id is string => id !== null);
          await notifySubscribers(
            clubIds,
            `🏁 Full time: ${liveMatch.homeTeam.name} ${homeScore}-${awayScore} ${liveMatch.awayTeam.name}`,
            `${liveMatch.competition.name} · final score`,
            matchId
          );
        }
      }
      await clearMatchStarted(matchId);
    } catch (error) {
      // Couldn't confirm this match's final state this run (likely a
      // rate-limit hit) - leave it tracked as started so the next run
      // tries again, rather than risk missing its full-time alert.
      console.error(`check-goals: couldn't confirm final state for match ${matchId}`, error);
    }
  }

  return NextResponse.json({
    kickoffsSent,
    fullTimesSent,
    notificationsSent,
    subscribers: subscriptions.length,
  });
}
