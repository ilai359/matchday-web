import { NextResponse } from "next/server";
import webpush from "web-push";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet, isCompetitionLive } from "@/lib/cache";
import { matchClubId, leaguesToCodes } from "@/lib/footballApi";
import {
  getStartedMatchIds,
  markMatchStarted,
  clearMatchStarted,
  getRemindedMatchIds,
  markMatchReminded,
  clearMatchReminded,
  getIdleUntil,
  setIdleUntil,
} from "@/lib/goalWatch";
import { getKnownPositions, setKnownPositions, PositionMap } from "@/lib/tableWatch";
import { getAllSubscriptions } from "@/lib/pushSubscriptions";
import { sendToDevice } from "@/lib/pushSend";
import { isApnsConfigured } from "@/lib/apns";
import { getClub, getClubName } from "@/lib/clubHelpers";
import { fetchLiveUpdates } from "@/lib/newsApi";
import { refreshScorersAfterMatch } from "@/lib/scorersData";

// Same URL the GitHub Actions workflow itself calls this app at (see
// .github/workflows/check-goals.yml) - needed here because fetchLiveUpdates
// normally calls relative paths like "/api/news", which only resolve on
// their own in the browser. A server-side caller has to hand it a real
// origin instead.
const SITE_BASE_URL = "https://matchday-web-zeta.vercel.app";

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
  status?: string;
  competition: { name: string };
  homeTeam: RawTeam;
  awayTeam: RawTeam;
  utcDate: string;
};

type RawSingleMatch = {
  score?: { fullTime?: { home: number | null; away: number | null } };
  status?: string;
  homeTeam?: RawTeam;
  awayTeam?: RawTeam;
  competition?: { name: string; code?: string };
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

// Wraps one phase of runCheckGoals so that if something inside it
// throws, the error message says WHICH phase failed (e.g. "[standings
// loop] r is not iterable") instead of just the bare error. Minified
// production stack traces are close to useless for figuring out which
// of several `for` loops below actually broke - this makes the JSON
// response itself point at the right one, no source maps needed.
async function withSection<T>(section: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[${section}] ${message}`);
  }
}

// The real work lives here, called by GET below from inside a
// catch-everything wrapper. Split out so that genuinely ANY failure in
// here - a missing env var, a malformed VAPID key, an unexpected bug in
// code below that nobody's written a try/catch around yet, literally
// anything - gets turned into a readable JSON response instead of a
// bare 500.
//
// Why this matters beyond just "cleaner code": `curl --fail`, which the
// GitHub Actions workflow uses to call this route, throws away the
// response BODY on any non-2xx status - it only ever reports the bare
// status code. That made every past failure here a dead end: GitHub's
// log said "500", Vercel's own request logs only keep ~1 hour of
// history on the free plan, and the actual reason was gone by the time
// anyone went looking. Returning 200 with the real error inside the
// JSON body - rather than a non-2xx status - means curl prints it, the
// GitHub Actions log shows it directly, and the job stops "failing" (so
// the every-5-minutes failure emails stop) even while something here
// still needs fixing. A genuinely broken check-goals run is still
// visible (its JSON says `"ok": false`), just not failing the whole
// job over it.
async function runCheckGoals(): Promise<NextResponse> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  const missing = [
    !apiKey && "FOOTBALL_DATA_API_KEY",
    !vapidPublic && "VAPID_PUBLIC_KEY",
    !vapidPrivate && "VAPID_PRIVATE_KEY",
    !vapidSubject && "VAPID_SUBJECT",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0 || !apiKey || !vapidPublic || !vapidPrivate || !vapidSubject) {
    // Named explicitly (rather than one generic message) so whichever
    // one is actually missing/empty in Vercel's env vars is immediately
    // obvious from the response body, instead of having to guess among
    // four.
    return NextResponse.json({
      ok: false,
      error: `Missing required environment variable(s): ${missing.join(", ")}`,
    });
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

  // Nothing on right now (see the end of this function) - skip this run.
  const idleUntil = await getIdleUntil();
  if (Date.now() < idleUntil) {
    return NextResponse.json({ ok: true, idleUntil: new Date(idleUntil).toISOString() });
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
      ok: true,
      remindersSent,
      kickoffsSent,
      fullTimesSent,
      notificationsSent,
      subscribers: 0,
      pushConfigured,
    });
  }

  // Only the competitions someone subscribed actually follows a club in
  // (plus CL - see leaguesToCodes). This job now runs every 5 minutes
  // (cron-job.org) instead of every few hours, and checking all 8
  // competitions each time fired ~16 football-data.org requests in one
  // burst against a 10-per-minute limit shared with every visitor -
  // which starved the Matches page itself and made it fall back to old
  // cached match lists.
  const watchedCompetitions = leaguesToCodes(
    subscriptions
      .flatMap((s) => s.clubIds)
      .map((id) => getClub(id)?.league)
      .filter((league): league is string => Boolean(league))
  );

  async function notifySubscribers(clubIds: string[], title: string, body: string, url: string) {
    if (clubIds.length === 0) return;
    // Browsers (web push) and the iPhone app (APNs) both go through
    // sendToDevice, which also cleans up any device that's no longer
    // valid. One device failing never stops the rest from being sent.
    for (const sub of subscriptions) {
      if (!sub.clubIds.some((id) => clubIds.includes(id))) continue;
      const outcome = await sendToDevice(sub, { title, body, url }, pushConfigured);
      if (outcome === "sent") notificationsSent += 1;
    }
  }

  const previouslyStarted = await getStartedMatchIds();
  const previouslyReminded = await getRemindedMatchIds();
  const stillLiveIds = new Set<string>();
  const liveMatchesById = new Map<string, RawLiveMatch>();
  // For table alerts (see the standings loop below): competitions whose
  // current round isn't over yet - a match kicks off within the next 30
  // hours, or kicked off within the last 3 - and competitions whose
  // fixture list couldn't be loaded this run (so we can't tell).
  const roundStillGoing = new Set<string>();
  const fixturesUnknown = new Set<string>();

  // Per competition: its fixtures from yesterday to two days ahead, every
  // status (cached 30 minutes - kickoff times don't change minute to
  // minute). Everything below that only needs kickoff times works off
  // this one list: whether a match is close enough to bother checking
  // live scores at all, the "starting soon" reminders, and whether the
  // round is over for table alerts.
  const fixturesByCompetition = new Map<string, RawScheduledMatch[]>();
  let anyMightBeLive = false;

  await withSection("kickoff/reminder loop", async () => {
  await Promise.all(watchedCompetitions.map(async (competition) => {
    const now = Date.now();
    let fixtures: RawScheduledMatch[];
    try {
      const dateFrom = new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dateTo = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const data = await getOrSet(`goals:fixtures:${competition}`, 30 * 60 * 1000, async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${competition}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return response.json();
      });
      fixtures = ((data as { matches?: RawScheduledMatch[] })?.matches ?? []) as RawScheduledMatch[];
      fixturesByCompetition.set(competition, fixtures);
    } catch {
      // Can't tell what's on in this competition right now - skip it
      // this run (nothing tracked is lost; the next run tries again) and
      // keep its table untouched.
      fixturesUnknown.add(competition);
      return;
    }

    const kickoffOf = (match: RawScheduledMatch) => new Date(match.utcDate).getTime();
    const notOverYet = (match: RawScheduledMatch) =>
      match.status !== "FINISHED" &&
      match.status !== "POSTPONED" &&
      match.status !== "CANCELLED" &&
      match.status !== "SUSPENDED" &&
      match.status !== "AWARDED";

    // Round not over yet: a match still to be finished that kicks off in
    // the next 30 hours, or kicked off in the last 3.
    if (
      fixtures.some((match) => {
        const kickoff = kickoffOf(match);
        return (
          notOverYet(match) &&
          kickoff > now - 3 * 60 * 60 * 1000 &&
          kickoff < now + 30 * 60 * 60 * 1000
        );
      })
    ) {
      roundStillGoing.add(competition);
    }

    // Only spend a live-score request on this competition when a match in
    // it could actually be in play: kicking off in the next 20 minutes,
    // kicked off in the last 3.5 hours, or already being tracked as
    // started. Most of the day nothing is on, and this job (which runs
    // every 5 minutes) used to ask football-data.org for live scores in
    // every followed league on every single run anyway - using up the
    // same 10-requests-a-minute limit the app's own pages depend on.
    const mightBeLive = fixtures.some((match) => {
      const kickoff = kickoffOf(match);
      return (
        previouslyStarted.has(String(match.id)) ||
        (kickoff > now - 3.5 * 60 * 60 * 1000 && kickoff < now + 20 * 60 * 1000)
      );
    });

    if (mightBeLive) anyMightBeLive = true;

    let liveMatches: RawLiveMatch[] = [];
    if (mightBeLive) {
      try {
        // Shared with /api/matches, which caches the raw football-data.org
        // response object ({ matches: [...] }) under this same key.
        const data = await getOrSet(`matches:${competition}:LIVE`, 60 * 1000, async () => {
          const response = await fetchWithRetry(
            `https://api.football-data.org/v4/competitions/${competition}/matches?status=LIVE`,
            { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
          );
          if (!response.ok) {
            throw new Error(`football-data.org returned ${response.status}`);
          }
          return response.json();
        });
        liveMatches = ((data as { matches?: RawLiveMatch[] })?.matches ?? []) as RawLiveMatch[];
      } catch {
        // Live check failed (most likely a rate limit) - try again next
        // run. Tracked matches stay tracked, so nothing is lost or
        // falsely announced.
        liveMatches = [];
      }
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

    for (const match of fixtures) {
      if (match.status !== "SCHEDULED" && match.status !== "TIMED") continue;
      const matchId = String(match.id);
      if (previouslyReminded.has(matchId)) continue;

      const minutesUntilKickoff = (kickoffOf(match) - Date.now()) / 60_000;
      // Outside the reminder window (too far away, or already started) -
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

  }));
  });

  // Any match that was tracked as started last run, but isn't in any
  // competition's LIVE list this run, has left play - either finished,
  // or postponed/abandoned. Either way, look up its current state once
  // (not repeatedly) to get the real final score and send the full-time
  // alert, then stop tracking it.
  await withSection("full-time loop", async () => {
  await Promise.all(Array.from(previouslyStarted).map(async (matchId) => {
    if (stillLiveIds.has(matchId)) return;

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
        // Read team names/competition straight off this single-match
        // lookup (the real API always includes them) rather than
        // liveMatchesById, which only ever holds matches that are STILL
        // live as of this run - a match that just finished is, by
        // definition, never in it. Falling back to `liveMatch` here only
        // covers the (never expected) case where the API response itself
        // is missing these fields.
        const homeTeam = single.homeTeam ?? liveMatch?.homeTeam;
        const awayTeam = single.awayTeam ?? liveMatch?.awayTeam;
        const competitionName = single.competition?.name ?? liveMatch?.competition.name;
        if (homeScore !== null && awayScore !== null && homeTeam && awayTeam && competitionName) {
          fullTimesSent += 1;
          const homeClubId = matchClubId(homeTeam.name);
          const awayClubId = matchClubId(awayTeam.name);
          const clubIds = [homeClubId, awayClubId].filter((id): id is string => id !== null);
          await notifySubscribers(
            clubIds,
            `🏁 Full time: ${homeTeam.name} ${homeScore}-${awayScore} ${awayTeam.name}`,
            `${competitionName} · final score`,
            `/match/${matchId}`
          );
        }
        // Refresh this competition's top-scorers cache right away -
        // see scorersData.ts. single.competition?.code is football-
        // data.org's own short code (e.g. "PL"), the same ones used as
        // cache keys everywhere else in this app, so no lookup/mapping
        // is needed here.
        if (single.competition?.code) {
          await refreshScorersAfterMatch(single.competition.code, apiKey);
        }
      }
      // Only stop tracking a match once it has really left play
      // (finished, postponed, cancelled...). If it's still in play - e.g.
      // its competition's live list just failed to load this run - keep
      // tracking it, otherwise the next run would see it "kick off" again
      // and send a second kickoff alert.
      const stillInPlay =
        single.status === "IN_PLAY" ||
        single.status === "PAUSED" ||
        single.status === "LIVE" ||
        single.status === "TIMED" ||
        single.status === "SCHEDULED";
      if (!stillInPlay) {
        await clearMatchStarted(matchId);
      }
    } catch (error) {
      // Couldn't confirm this match's final state this run (likely a
      // rate-limit hit) - leave it tracked as started so the next run
      // tries again, rather than risk missing its full-time alert.
      console.error(`check-goals: couldn't confirm final state for match ${matchId}`, error);
    }
  }));
  });

  // Table-position alerts: one per round, not one per match. A league's
  // table only counts as settled once its whole round is over - no match
  // being played (isCompetitionLive) and none kicking off in the next 30
  // hours (roundStillGoing, from the fixture list above). Only then is
  // each tracked club's position compared to where it was after the
  // previous round, and anyone following a club that moved is told once.
  // Without the 30-hour check, a matchday with several kickoff times
  // sent an alert after every game, often contradicting the previous one
  // (up to 3rd after your club's game, back to 4th after a later one).
  // 30 hours covers the usual Friday-to-Monday spread of a weekend round.
  let positionChangesSent = 0;
  await withSection("standings loop", async () => {
  await Promise.all(watchedCompetitions.map(async (competition) => {
    if (roundStillGoing.has(competition) || fixturesUnknown.has(competition)) return;
    if (await isCompetitionLive(competition)) return;
    // A table only changes when a match finishes, so only look at it when
    // a match in this league finished in the last 12 hours - or when
    // there's no saved starting point yet. Otherwise there's nothing new
    // to compare, and fetching it every few minutes all day just uses up
    // the data limit the app's own pages need.
    const recentlyFinished = (fixturesByCompetition.get(competition) ?? []).some(
      (match) =>
        match.status === "FINISHED" &&
        new Date(match.utcDate).getTime() > Date.now() - 12 * 60 * 60 * 1000
    );
    if (!recentlyFinished && Object.keys(await getKnownPositions(competition)).length > 0) {
      return;
    }

    let table: RawStandingsRow[];
    try {
      // Caches the RAW football-data.org response object (same shape
      // /api/standings uses), extracting the TOTAL table after the cache
      // call rather than before it.
      // Its own key with a 10-minute TTL, separate from the 60s one
      // /api/standings keeps for visitors: a table only changes when a
      // match finishes, so a position alert arriving a few minutes after
      // the round settles is fine - and it stops this 5-minute job from
      // re-fetching every followed league's table on every single run.
      const standingsData = await getOrSet(`goals:standings:${competition}`, 10 * 60 * 1000, async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/competitions/${competition}/standings`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return response.json();
      });
      table =
        (standingsData as RawStandingsResponse)?.standings?.find((s) => s.type === "TOTAL")?.table ?? [];
    } catch {
      // Couldn't get this competition's table this run (most likely a
      // rate-limit hit) - skip it, try again next run.
      return;
    }

    const knownPositions = await getKnownPositions(competition);
    const updatedPositions: PositionMap = { ...knownPositions };
    let anyChange = false;
    // Also true when a club is seen for the first time, so that position
    // gets saved as the starting point to compare against next time.
    // (Without this the very first table was never saved, nothing ever
    // had anything to compare to, and no table alert could ever fire.)
    let anyNew = false;

    for (const row of table) {
      const clubId = matchClubId(row.team.name);
      if (!clubId) continue;
      updatedPositions[clubId] = row.position;

      const previousPosition = knownPositions[clubId];
      // First time this club's ever been checked (e.g. right after this
      // feature shipped) - just record where it is, nothing to compare
      // against yet.
      if (previousPosition === undefined) {
        anyNew = true;
        continue;
      }
      if (previousPosition === row.position) continue;

      anyChange = true;
      positionChangesSent += 1;
      const movedUp = row.position < previousPosition;
      const places = Math.abs(previousPosition - row.position);
      const placesText = places === 1 ? "one place" : `${places} places`;
      const leagueName = LEAGUE_IN_SENTENCE[competition] ?? competition;
      // e.g. "⬆️ Tottenham climbed 3 places to 4th in the Premier League",
      // "⬆️ Tottenham climbed one place to the top of the Premier League",
      // "⬇️ Tottenham dropped 2 places to 6th in the Premier League".
      // The app's short club name, not the API's full one ("Tottenham
      // Hotspur FC").
      const clubName = getClubName(clubId);
      const title = movedUp
        ? row.position === 1
          ? `⬆️ ${clubName} climbed ${placesText} to the top of ${leagueName}`
          : `⬆️ ${clubName} climbed ${placesText} to ${ordinal(row.position)} in ${leagueName}`
        : `⬇️ ${clubName} dropped ${placesText} to ${ordinal(row.position)} in ${leagueName}`;
      await notifySubscribers(
        [clubId],
        title,
        `Now on ${row.points} points`,
        `/clubs/${clubId}`
      );
    }

    if (anyChange || anyNew) {
      await setKnownPositions(competition, updatedPositions);
    }

  }));
  });

  // Keep the Updates tab's news cache warm for whoever's actually
  // subscribed, so opening it doesn't also have to pay for a live
  // NewsData.io fetch *and* a Claude relevance/dedup call right at that
  // moment - by far the slowest single thing in the app, since the AI
  // step alone can take several seconds. This calls the exact same
  // fetchLiveUpdates pipeline (and cache keys) the Updates page itself
  // uses, just triggered by this cron's own schedule instead of a real
  // visit, for the union of every subscriber's actual followed clubs -
  // not hardcoded to any one person, derived from the same push
  // subscriptions already read above. Deliberately its own try/catch
  // (not withSection) - a hiccup here should never turn kickoffs,
  // reminders, full-times or standings - all of which already
  // succeeded by this point - into a reported failure.
  let newsWarmed = false;
  try {
    const subscribedClubIds = Array.from(
      new Set(subscriptions.flatMap((sub) => sub.clubIds))
    );
    const clubNames = subscribedClubIds.map((id) => getClubName(id));
    const leagues = Array.from(
      new Set(
        subscribedClubIds
          .map((id) => getClub(id)?.league)
          .filter((league): league is string => Boolean(league))
      )
    );
    if (clubNames.length > 0) {
      // At most once every 3 hours, not on every 5-minute run: the news
      // source only publishes articles with a ~12-hour delay anyway, and
      // warming it every 5 minutes burned through its small daily quota
      // (and the cache's request allowance) for nothing.
      await getOrSet("goals:news-warmed", 3 * 60 * 60 * 1000, async () => {
        await fetchLiveUpdates(clubNames, leagues, SITE_BASE_URL);
        return true;
      });
      newsWarmed = true;
    }
  } catch (error) {
    console.error("check-goals: news warm-up failed", error);
  }

  // When nothing is on - no match about to start or being played, nothing
  // being tracked, and every league's fixtures loaded fine - the next runs
  // can be skipped until 20 minutes before the next kickoff (in time for
  // its "starting soon" reminder), and at most 30 minutes, so fixtures,
  // tables and followed clubs still get re-checked regularly. Most of the
  // day this turns the every-5-minutes job into one cheap read.
  let nextIdleUntil = 0;
  if (!anyMightBeLive && previouslyStarted.size === 0 && fixturesUnknown.size === 0) {
    const now = Date.now();
    let earliestKickoff = Infinity;
    for (const list of fixturesByCompetition.values()) {
      for (const match of list) {
        if (match.status !== "SCHEDULED" && match.status !== "TIMED") continue;
        const kickoff = new Date(match.utcDate).getTime();
        if (kickoff > now && kickoff < earliestKickoff) earliestKickoff = kickoff;
      }
    }
    nextIdleUntil = Math.min(earliestKickoff - 20 * 60 * 1000, now + 30 * 60 * 1000);
    if (nextIdleUntil > now) {
      await setIdleUntil(nextIdleUntil);
    }
  }

  return NextResponse.json({
    ok: true,
    idleUntil: nextIdleUntil > Date.now() ? new Date(nextIdleUntil).toISOString() : null,
    remindersSent,
    kickoffsSent,
    fullTimesSent,
    positionChangesSent,
    notificationsSent,
    subscribers: subscriptions.length,
    // How many of those are the iPhone app rather than a browser, and
    // whether Apple push is set up - makes it obvious from this response
    // alone whether app notifications can actually go out.
    appSubscribers: subscriptions.filter((s) => s.apnsToken).length,
    pushConfigured,
    apnsConfigured: isApnsConfigured(),
    newsWarmed,
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.GOALS_CRON_SECRET ||
    authHeader !== `Bearer ${process.env.GOALS_CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await runCheckGoals();
  } catch (error) {
    // The genuinely-unexpected case: something inside runCheckGoals
    // threw and nothing closer to it caught it. Logged for Vercel's own
    // logs (useful within their ~1 hour retention), and also returned
    // directly in the response body so it's visible immediately via
    // GitHub Actions' log or a plain curl, without needing to catch it
    // in Vercel's logs in time.
    console.error("check-goals: unhandled error", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// How each league reads in the middle of a table alert ("...to 4th in the
// Premier League", "...to the top of La Liga") - keyed by football-data's
// competition code, which is what the standings loop works with. This used
// to go through formatCompetition, which expects a full competition name,
// so the alert said "in PL".
const LEAGUE_IN_SENTENCE: Record<string, string> = {
  PL: "the Premier League",
  PD: "La Liga",
  BL1: "the Bundesliga",
  FL1: "Ligue 1",
  SA: "Serie A",
  CL: "the Champions League",
  DED: "the Eredivisie",
  PPL: "the Primeira Liga",
};

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
