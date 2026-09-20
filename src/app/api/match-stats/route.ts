import { NextResponse } from "next/server";
import {
  EuroCompetitionCode,
  fetchFixtureStatistics,
  findFixtureId,
  fixtureStatsCacheSeconds,
  isDomesticLeagueCode,
  orderFixtureStatsForMatch,
  resolveDomesticLeagueId,
} from "@/lib/apiFootball";

const EURO_CODES = new Set<string>(["EL", "ECL"]);

function isEuroCode(code: string): code is EuroCompetitionCode {
  return EURO_CODES.has(code);
}

// Team-level match stats (possession, shots, corners, cards, fouls) for
// one specific match, sourced from API-Football - the only one of our
// two data sources that has this at all. Only ever called for a match
// that's live or already finished (there's nothing to show before then),
// and the client already knows to only ask in that case.
//
// Two very different paths depending on the competition:
//   - Europa/Conference League matches already come FROM API-Football
//     (football-data.org doesn't offer either at all), so `matchId` IS
//     already a real API-Football fixture id - nothing to resolve.
//   - A domestic-league match (Premier League, La Liga, etc.) comes from
//     football-data.org, which has its own, unrelated match ids, so we
//     first have to find the matching API-Football fixture by team names
//     and kickoff date (see findFixtureId).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition");
  const season = searchParams.get("season");
  const homeTeam = searchParams.get("homeTeam");
  const awayTeam = searchParams.get("awayTeam");
  const kickoff = searchParams.get("kickoff");
  const matchId = searchParams.get("matchId");
  const finished = searchParams.get("finished") === "1";

  if (!competition || !matchId) {
    return NextResponse.json({ stats: null });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json({ stats: null });
  }

  try {
    let fixtureId: number | null = null;

    if (isEuroCode(competition)) {
      const parsed = Number(matchId);
      fixtureId = Number.isFinite(parsed) ? parsed : null;
    } else if (
      isDomesticLeagueCode(competition) &&
      season &&
      homeTeam &&
      awayTeam &&
      kickoff
    ) {
      const leagueId = await resolveDomesticLeagueId(apiKey, competition);
      if (leagueId) {
        fixtureId = await findFixtureId(
          apiKey,
          leagueId,
          season,
          homeTeam,
          awayTeam,
          kickoff
        );
      }
    }

    if (!fixtureId) {
      return NextResponse.json({ stats: null });
    }

    const rawStats = await fetchFixtureStatistics(
      apiKey,
      fixtureId,
      fixtureStatsCacheSeconds(finished)
    );
    if (rawStats.length === 0) {
      return NextResponse.json({ stats: null });
    }
    const stats =
      homeTeam && awayTeam
        ? orderFixtureStatsForMatch(rawStats, homeTeam, awayTeam)
        : rawStats;
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
