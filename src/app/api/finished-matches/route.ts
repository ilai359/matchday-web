import { NextResponse } from "next/server";
import {
  EURO_COMPETITION_NAMES,
  EuroCompetitionCode,
  fetchFinishedFixtures,
  resolveLeagueId,
} from "@/lib/apiFootball";

const EURO_CODES = new Set<string>(["EL", "ECL"]);

function isEuroCode(code: string): code is EuroCompetitionCode {
  return EURO_CODES.has(code);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition");
  const season = searchParams.get("season");
  if (!competition) {
    return NextResponse.json({ error: "Missing competition code" }, { status: 400 });
  }

  // Europa League and Conference League come from a different data source
  // (football-data.org doesn't offer them at all) - "EL"/"ECL" aren't real
  // football-data.org codes, they're just our own labels for those two.
  if (isEuroCode(competition)) {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey || !season) {
      return NextResponse.json({ matches: [] });
    }
    try {
      const leagueId = await resolveLeagueId(apiKey, competition);
      if (!leagueId) {
        return NextResponse.json({ matches: [] });
      }
      const matches = await fetchFinishedFixtures(
        apiKey,
        leagueId,
        season,
        EURO_COMPETITION_NAMES[competition]
      );
      return NextResponse.json({ matches });
    } catch (error) {
      return NextResponse.json(
        { error: "Something went wrong", details: String(error) },
        { status: 500 }
      );
    }
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }
  try {
    const seasonParam = season ? `&season=${season}` : "";
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED${seasonParam}`,
      { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 3600 } }
    );
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch finished matches" }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong", details: String(error) }, { status: 500 });
  }
}
