import { clubs } from "../data/clubs";

export type LiveMatch = {
  id: string;
  competition: string;
  homeClubId: string;
  awayClubId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoff: string;
  venue: string;
  status: string;
};

const CLUB_ALIASES: Record<string, string[]> = {
  arsenal: ["arsenal fc", "arsenal"],
  "real-madrid": ["real madrid cf", "real madrid"],
  barcelona: ["fc barcelona", "barcelona"],
  "fc-zurich": ["fc zürich", "fc zurich"],
  "fc-basel": ["fc basel 1893", "fc basel"],
  "bayern-munich": ["fc bayern münchen", "fc bayern munich", "bayern munich"],
  liverpool: ["liverpool fc", "liverpool"],
  "manchester-city": ["manchester city fc", "manchester city"],
  "paris-saint-germain": ["paris saint-germain fc", "paris saint-germain", "psg"],
  juventus: ["juventus fc", "juventus"],
  "borussia-dortmund": ["borussia dortmund"],
  "young-boys": ["bsc young boys", "young boys"],
  ajax: ["afc ajax", "ajax"],
  psv: ["psv", "psv eindhoven"],
  porto: ["fc porto", "porto"],
  benfica: ["sl benfica", "benfica"],
  "sporting-cp": ["sporting clube de portugal", "sporting cp"],
};

function matchClubId(apiTeamName: string): string | null {
  const normalized = apiTeamName.toLowerCase().trim();

  for (const club of clubs) {
    const aliases = CLUB_ALIASES[club.id] ?? [club.name.toLowerCase()];
    if (aliases.includes(normalized)) {
      return club.id;
    }
  }

  return null;
}

type RawApiMatch = {
  id: number;
  utcDate: string;
  status: string;
  venue?: string;
  competition: { name: string };
  homeTeam: { name: string; crest?: string };
  awayTeam: { name: string; crest?: string };
};

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  const response = await fetch("/api/matches");

  if (!response.ok) {
    throw new Error("Failed to fetch live matches");
  }

  const data = await response.json();
  const rawMatches: RawApiMatch[] = data.matches ?? [];

  return rawMatches
    .map((match) => {
      const homeClubId = matchClubId(match.homeTeam.name);
      const awayClubId = matchClubId(match.awayTeam.name);

      return {
        id: String(match.id),
        competition: match.competition.name,
        homeClubId: homeClubId ?? match.homeTeam.name,
        awayClubId: awayClubId ?? match.awayTeam.name,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        homeCrest: match.homeTeam.crest ?? null,
        awayCrest: match.awayTeam.crest ?? null,
        kickoff: match.utcDate,
        venue: match.venue ?? "",
        status: match.status,
      };
    })
    .filter((match) => match.status === "TIMED" || match.status === "SCHEDULED");
}