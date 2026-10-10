import { NextResponse } from "next/server";
import webpush from "web-push";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet, isCompetitionLive } from "@/lib/cache";
import { COMPETITIONS } from "@/lib/competitions";
import { matchClubId } from "@/lib/footballApi";
import { formatCompetition } from "@/lib/competitionNames";
import {
  getStartedMatchIds,
  markMatchStarted,
  clearMatchStarted,
  getRemindedMatchIds,
  markMatchReminded,
  clearMatchReminded,
} from "@/lib/goalWatch";
import { getKnownPositions, setKnownPositions, PositionMap } from "@/lib/tableWatch";
import { getAllSubscriptions, removeSubscriptionByEndpoint } from "@/lib/pushSubscriptions";

// Runs frequently (every few minutes - see the GitHub Actions workflow
// at .github/workflows/check-goals.yml) and sends four kinds of alert
// to anyone following either club in a match: one about 15 minutes
// before kickoff, one right when the match kicks off, one when it's
// over (with the final score), and - once a competition's table is no
// longer mid-match (see isCompetitionLive in cache.ts, the same freeze
// /api/standings uses) - one if a followed club's league position
// actually moved since the last check.
//
// It deliberately does NOT try to alert on individual goals while a
// match is still being played. football-data.org's free plan delays
// live scores during play (see NOTES.md), so a goal-by-goal alert could
// lag minutes behind the real thing - worse than no alert at all. The
// first three alerts this sends instead are all things that are
// reliable even when the in-play score isn't: "is this match starting
// soon", "has it started", and "has it finished" (with the real final
// score, read once it's actually over). The table-position alert is
// reliable for the same reason the table-freeze fix is: it only ever
// looks once nothing in that competition is still being played.
//
// This can't be Vercel's own cron (see warm-finished-matches/route.ts
// for that mechanism) because Vercel's free Hobby plan only allows cron
// jobs to run once a day - nowhere near fast enough for a kickoff alert
// to still feel like one. GitHub Actions' scheduled workflows are free
// and can run every few minutes instead, so this route is called from
// there, authenticated with its own secret (GOALS_CRON_SECRET) the same
// way the Vercel cron job authenticates with CRON_SECRET.
//
// Deliberately reuses the exact same cache keys (`matches:${code}:LIVE`
// and `matches:${code}:SCHEDULED`, both 60-second TTL) that /api/matches
// already uses for real visitors, so this job only spends its own
// football-data.org request when nobody's looked recently. The one
// extra request this adds beyond that - a single-match lookup - only
// happens once per match, right when it's confirmed finished, not on
// every tick.
export const maxDuration = 60;

type RawTeam = { name: string };

type RawLiveMatch = {
  id: number;
  competition: { name: string };
  homeTeam: RawTeam;
  awayTeam: RawTeam;
};

type RawScheduledMatch = {
  id: number;
  competition: { name: string };
  homeTeam: RawTeam;
  awayTeam: RawTeam;
  utcDate: string;
};

type RawSingleMatch = {
  score?: { fullTime?: { home: number | null; away: number | null } };
  status?: string;
};

type RawStandingsRow = {
  position: number;
  points: number;
  team: { name: string };
};

type RawStandingsResponse = {
  standings?: { type: string; table: RawStandingsRow[] }[];
};

// How long before kickoff the "starting soon" reminder goes out. The
// job runs roughly every 5 minutes, so a scheduled match's minutes-
// until-kickoff will land somewhere inside this window at least once
// before it starts - the alert isn't sent at exactly 15:00 to go, just
// the first time it's checked and found to be 15 minutes or less away.
const REMINDER_WINDOW_MINUTES = 15;

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

  // Configuring web-push validates the VAPID keys' format (correct
  // length, correct encoding) and throws immediately if they're
  // malformed - which used to crash this entire route with a 500 if
  // anything about them was ever slightly wrong (e.g. a copy-paste
  // mistake when rotating them in Vercel). That's a push-notification
  // problem, not a reason to also stop tracking kickoffs/full-times/
  // table changes, so it's now caught and only disables sending actual
  // notifications for this run - everything else still works, and the
  // route still returns a normal 2xx instead of failing the whole
  // GitHub Actions job (and emailing a failure notice) over it.
  let pushConfigured = true;
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch (error) {
    pushConfigured = false;
    console.error(
      "check-goals: webpush.setVapidDetails rejected the configured VAPID keys - " +
        "notifications are disabled for this run. Check VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT in Vercel.",
      error
    );
  }

  const subscriptions = await getAllSubscriptions();
  let remindersSent = 0;
  let kickoffsSent = 0;
  let fullTimesSent = 0;
  let notificationsSent = 0;

  // Nobody's subscribed yet - nothing to check or send, no point
  // spending football-data.org requests on it.
  if (subscriptions.length === 0) {
    return NextResponse.json({
      remindersSent,
      kickoffsSent,
      fullTimesSent,
      notificationsSent,
      subscribers: 0,
      pushConfigured,
    });
  }

  async function notifySubscribers(clubIds: string[], title: string, body: string, url: string) {
    if (clubIds.length === 0) return;
    if (!pushConfigured) return;
    const payload = JSON.stringify({ title, body, url });
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
  const previouslyReminded = await getRemindedMatchIds();
  const stillLiveIds = new Set<string>();
  const liveMatchesById = new Map<string, RawLiveMatch>();

  for (const competition of COMPETITIONS) {
    let liveMatches: RawLiveMatch[];
    try {
      liveMatches = await getOrSet(`matches:${competition}:LIVE`, 60 * 1000, async () => {
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
      // This competition's live check failed (most likely a rate-limit
      // hit) - skip it this run rather than fail the whole job; it'll
      // be tried again on the next scheduled run a few minutes later.
      // Any match from this competition that was already tracked as
      // started stays tracked (we just didn't see it this run), so it
      // won't falsely trigger a full-time alert either.
      liveMatches = [];
    }

    for (const match of liveMatches) {
      const matchId = String(match.id);
      stillLiveIds.add(matchId);
      liveMatchesById.set(matchId, match);

      if (previouslyStarted.has(matchId)) continue;

      // First time we've seen this match in the LIVE list - it just
      // kicked off.
      await markMatchStarted(matchId);
      await clearMatchReminded(matchId);
      kickoffsSent += 1;

      const homeClubId = matchClubId(match.homeTeam.name);
      const awayClubId = matchClubId(match.awayTeam.name);
      const clubIds = [homeClubId, awayClubId].filter((id): id is string => id !== null);
      await notifySubscribers(
        clubIds,
        `⚽ Kickoff: ${match.homeTeam.name} vs ${match.awayTeam.name}`,
        `${match.competition.name} is underway`,
        `/match/${matchId}`
      );
    }

    let scheduledMatches: RawScheduledMatch[];
    try {
      scheduledMatches = await getOrSet(`matches:${competition}:SCHEDULED`, 60 * 1000, async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${competition}/matches?status=SCHEDULED`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        const data = await response.json();
        return (data.matches ?? []) as RawScheduledMatch[];
      });
    } catch {
      scheduledMatches = [];
    }

    for (const match of scheduledMatches) {
      const matchId = String(match.id);
      if (previouslyReminded.has(matchId)) continue;

      const minutesUntilKickoff = (new Date(match.utcDate).getTime() - Date.now()) / 60_000;
      // Outside the reminder window (too far away, or already started -
      // negative means it should already be in the LIVE list above) -
      // nothing to do yet.
      if (minutesUntilKickoff > REMINDER_WINDOW_MINUTES || minutesUntilKickoff <= 0) continue;

      await markMatchReminded(matchId);
      remindersSent += 1;

      const homeClubId = matchClubId(match.homeTeam.name);
      const awayClubId = matchClubId(match.awayTeam.name);
      const clubIds = [homeClubId, awayClubId].filter((id): id is string => id !== null);
      await notifySubscribers(
        clubIds,
        `⏰ Starting soon: ${match.homeTeam.name} vs ${match.awayTeam.name}`,
        `${match.competition.name} kicks off shortly`,
        `/match/${matchId}`
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
            `/match/${matchId}`
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

  // Table-position alerts: for every competition whose table isn't
  // currently frozen (see isCompetitionLive - "frozen" means a match in
  // it is still being played), compare each tracked club's position to
  // the last time we checked, and tell anyone subscribed to a club that
  // moved. Checked once per competition per run rather than tied to any
  // single match, so a Saturday with several kickoff times settles once
  // the whole round is actually over, instead of firing a notification
  // after every individual result and possibly flip-flopping mid-round.
  let positionChangesSent = 0;
  for (const competition of COMPETITIONS) {
    if (await isCompetitionLive(competition)) continue;

    let table: RawStandingsRow[];
    try {
      // Same cache key /api/standings already keeps fresh (see that
      // route) - reading it here costs an extra football-data.org
      // request only when nobody's looked at this competition's table
      // in the last 5 minutes.
      table = await getOrSet(`standings:${competition}`, 5 * 60 * 1000, async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${competition}/standings`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        const data = (await response.json()) as RawStandingsResponse;
        return data.standings?.find((s) => s.type === "TOTAL")?.table ?? [];
      });
    } catch {
      // Couldn't get this competition's table this run (most likely a
      // rate-limit hit) - skip it, try again next run.
      continue;
    }

    const knownPositions = await getKnownPositions(competition);
    const updatedPositions: PositionMap = { ...knownPositions };
    let anyChange = false;

    for (const row of table) {
      const clubId = matchClubId(row.team.name);
      if (!clubId) continue;
      updatedPositions[clubId] = row.position;

      const previousPosition = knownPositions[clubId];
      // First time this club's ever been checked (e.g. right after this
      // feature shipped) - just record where it is, nothing to compare
      // against yet.
      if (previousPosition === undefined || previousPosition === row.position) continue;

      anyChange = true;
      positionChangesSent += 1;
      const movedUp = row.position < previousPosition;
      await notifySubscribers(
        [clubId],
        `${movedUp ? "⬆️" : "⬇️"} ${row.team.name} ${movedUp ? "moved up to" : "dropped to"} ${ordinal(row.position)} in ${formatCompetition(competition)}`,
        `Now on ${row.points} points`,
        `/clubs/${clubId}`
      );
    }

    if (anyChange) {
      await setKnownPositions(competition, updatedPositions);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return NextResponse.json({
    remindersSent,
    kickoffsSent,
    fullTimesSent,
    positionChangesSent,
    notificationsSent,
    subscribers: subscriptions.length,
    pushConfigured,
  });
}

function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
