import { NextResponse } from "next/server";
import {
  EURO_COMPETITION_NAMES,
  EuroCompetitionCode,
  fetchUpcomingFixtures,
  resolveLeagueId,
} from "@/lib/apiFootball";

const COMPETITIONS = ["PL", "PD", "BL1", "FL1", "SA", "CL", "DED", "PPL"];

// Europa League and Conference League aren't offered by football-data.org
// at all (any plan) - this is a second, separate data source just for
// those two, on its own much smaller daily quota. Optional: if the key
// isn't set up, these two competitions are simply absent, same as before.
const EURO_COMPETITIONS: EuroCompetitionCode[] = ["EL", "ECL"];

async function fetchEuroMatches(apiKey: string) {
  const results = await Promise.all(
    EURO_COMPETITIONS.map(async (code) => {
      const leagueId = await resolveLeagueId(apiKey, code);
      if (!leagueId) return [];
      return fetchUpcomingFixtures(apiKey, leagueId, EURO_COMPETITION_NAMES[code]);
    })
  );
  return results.flat();
}

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const requests = COMPETITIONS.map((code) =>
      fetch(
        `https://api.football-data.org/v4/competitions/${code}/matches?status=SCHEDULED`,
        {
          headers: { "X-Auth-Token": apiKey },
          next: { revalidate: 3600 },
        }
      ).then((res) => (res.ok ? res.json() : { matches: [] }))
    );

    if (!process.env.API_FOOTBALL_KEY) {
      console.error(
        "[api/matches] API_FOOTBALL_KEY is not set in this running server's environment - Europa/Conference League will be skipped. If you just added it to .env.local, the dev server needs a full restart to pick it up."
      );
    }

    const [results, euroMatches] = await Promise.all([
      Promise.all(requests),
      // A missing key or a failed lookup just means these two competitions
      // are left out, same as if the whole thing weren't wired up yet.
      process.env.API_FOOTBALL_KEY
        ? fetchEuroMatches(process.env.API_FOOTBALL_KEY).catch((error) => {
            console.error("[api/matches] fetchEuroMatches threw:", error);
            return [];
          })
        : Promise.resolve([]),
    ]);
    console.error(
      `[api/matches] Europa/Conference fixtures added to the list: ${euroMatches.length}`
    );
    const allMatches = [
      ...results.flatMap((result) => result.matches ?? []),
      ...euroMatches,
    ];

    return NextResponse.json({ matches: allMatches });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
