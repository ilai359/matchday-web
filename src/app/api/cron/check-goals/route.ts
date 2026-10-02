import { NextResponse } from "next/server";
import webpush from "web-push";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";
import { COMPETITIONS } from "@/lib/competitions";
import { matchClubId } from "@/lib/footballApi";
import { getLastScore, setLastScore } from "@/lib/goalWatch";
import { getAllSubscriptions, removeSubscriptionByEndpoint } from "@/lib/pushSubscriptions";

// Runs frequently (every few minutes - see the GitHub Actions workflow
// at .github/workflows/check-goals.yml) to look for goals in live
// matches and push a notification to anyone following either club.
//
// This can't be Vercel's own cron (see warm-finished-matches/route.ts
// for that mechanism) because Vercel's free Hobby plan only allows cron
// jobs to run once a day - nowhere near fast enough for a goal alert to
// still feel like an alert. GitHub Actions' scheduled workflows are
// free and can run every few minutes instead, so this route is called
// from there, authenticated with its own secret (GOALS_CRON_SECRET) the
// same way the Vercel cron job authenticates with CRON_SECRET.
//
// Deliberately reuses the exact same cache key format
// (`matches:${code}:LIVE`, 60-second TTL) that /api/matches already uses
// for real visitors. That means this job makes its own football-data.org
// request only when nobody's looked recently - any time a real visitor
// already refreshed a competition's live matches in roughly the last
// minute, this job just reads that same cached answer for free instead
// of spending more of the shared 10-requests/minute budget.
export const maxDuration = 60;

type RawLiveMatch = {
  id: number;
  competition: { name: string };
  homeTeam: { name: string };
  awayTeam: { name: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
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
  let goalsFound = 0;
  let notificationsSent = 0;

  // Nobody's subscribed yet - nothing to check or send, no point
  // spending football-data.org requests on it.
  if (subscriptions.length === 0) {
    return NextResponse.json({ goalsFound, notificationsSent, subscribers: 0 });
  }

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
      // again on the next scheduled run a few minutes later.
      continue;
    }

    for (const match of matches) {
      const homeScore = match.score?.fullTime?.home ?? null;
      const awayScore = match.score?.fullTime?.away ?? null;
      if (homeScore === null || awayScore === null) continue;

      const matchId = String(match.id);
      const previous = await getLastScore(matchId);
      await setLastScore(matchId, homeScore, awayScore);

      // First time this match has ever been checked - nothing to compare
      // against, so there's nothing to call a "goal" yet. Without this,
      // every match would fire a false notification the moment it's
      // first seen, scoreless or not.
      if (!previous) continue;
      if (previous.homeScore === homeScore && previous.awayScore === awayScore) {
        continue;
      }

      goalsFound += 1;

      const homeClubId = matchClubId(match.homeTeam.name);
      const awayClubId = matchClubId(match.awayTeam.name);
      const scoringClubIds = [homeClubId, awayClubId].filter(
        (id): id is string => id !== null
      );
      if (scoringClubIds.length === 0) continue;

      const payload = JSON.stringify({
        title: `⚽ ${match.homeTeam.name} ${homeScore}-${awayScore} ${match.awayTeam.name}`,
        body: `${match.competition.name} · score update`,
        url: `/match/${matchId}`,
      });

      for (const sub of subscriptions) {
        if (!sub.clubIds.some((id) => scoringClubIds.includes(id))) continue;
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

    // Spread requests out so this job stays well under
    // football-data.org's shared rate limit, same spacing used by the
    // other cron job.
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return NextResponse.json({
    goalsFound,
    notificationsSent,
    subscribers: subscriptions.length,
  });
}
