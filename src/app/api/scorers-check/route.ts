import { NextResponse } from "next/server";

// Temporary check: can the API-Football key give us goal scorers for
// this season's matches on its plan? Protected by the alert-check
// secret. Never returns the key itself. Uses 3 of the day's requests.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== process.env.GOALS_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return NextResponse.json({ error: "API_FOOTBALL_KEY missing" });
  const headers = { "x-apisports-key": key };
  const get = async (path: string) => {
    const response = await fetch(`https://v3.football.api-sports.io${path}`, { headers, cache: "no-store" });
    return { status: response.status, body: await response.json().catch(() => null) };
  };

  const status = await get("/status");
  const date = url.searchParams.get("date") ?? "2026-10-31";
  const league = url.searchParams.get("league") ?? "78";
  const season = url.searchParams.get("season") ?? "2026";
  const fixtures = await get(`/fixtures?date=${date}&league=${league}&season=${season}`);
  const list = (fixtures.body?.response ?? []) as Array<{
    fixture: { id: number; status: { short: string } };
    teams: { home: { name: string }; away: { name: string } };
    goals: { home: number | null; away: number | null };
  }>;
  const finished = list.find((f) => f.fixture.status.short === "FT");
  const events = finished ? await get(`/fixtures/events?fixture=${finished.fixture.id}&type=Goal`) : null;

  return NextResponse.json({
    plan: status.body?.response?.subscription ?? null,
    requests: status.body?.response?.requests ?? null,
    statusErrors: status.body?.errors ?? null,
    fixturesErrors: fixtures.body?.errors ?? null,
    fixturesFound: list.length,
    sample: finished
      ? `${finished.teams.home.name} ${finished.goals.home}-${finished.goals.away} ${finished.teams.away.name}`
      : null,
    goals: ((events?.body?.response ?? []) as Array<{
      time: { elapsed: number; extra: number | null };
      team: { name: string };
      player: { name: string };
      detail: string;
    }>).map((e) => `${e.time.elapsed}${e.time.extra ? `+${e.time.extra}` : ""}' ${e.player.name} (${e.team.name}, ${e.detail})`),
    eventsErrors: events?.body?.errors ?? null,
  });
}
