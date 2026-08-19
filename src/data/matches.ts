export type Match = {
  id: string;
  competition: string;
  homeClubId: string;
  awayClubId: string;
  kickoff: string;
  venue: string;
  city: string;
  status: "scheduled" | "postponed" | "finished";
};

export const matches: Match[] = [
  {
    id: "m1",
    competition: "Premier League",
    homeClubId: "chelsea",
    awayClubId: "arsenal",
    kickoff: "2026-08-16T16:00:00",
    venue: "Stamford Bridge",
    city: "London",
    status: "scheduled",
  },
  {
    id: "m2",
    competition: "La Liga",
    homeClubId: "real-madrid",
    awayClubId: "valencia",
    kickoff: "2026-08-15T21:00:00",
    venue: "Santiago Bernabéu",
    city: "Madrid",
    status: "scheduled",
  },
  {
    id: "m3",
    competition: "Swiss Super League",
    homeClubId: "fc-zurich",
    awayClubId: "fc-basel",
    kickoff: "2026-08-17T16:30:00",
    venue: "Letzigrund",
    city: "Zürich",
    status: "scheduled",
  },
  {
    id: "m4",
    competition: "La Liga",
    homeClubId: "barcelona",
    awayClubId: "sevilla",
    kickoff: "2026-08-18T20:00:00",
    venue: "Camp Nou",
    city: "Barcelona",
    status: "scheduled",
  },
  {
    id: "m5",
    competition: "Bundesliga",
    homeClubId: "bayern-munich",
    awayClubId: "borussia-dortmund",
    kickoff: "2026-08-16T18:30:00",
    venue: "Allianz Arena",
    city: "Munich",
    status: "scheduled",
  },
  {
    id: "m6",
    competition: "Premier League",
    homeClubId: "liverpool",
    awayClubId: "everton",
    kickoff: "2026-08-19T15:00:00",
    venue: "Anfield",
    city: "Liverpool",
    status: "scheduled",
  },
  {
    id: "m7",
    competition: "Premier League",
    homeClubId: "manchester-city",
    awayClubId: "tottenham",
    kickoff: "2026-08-20T17:30:00",
    venue: "Etihad Stadium",
    city: "Manchester",
    status: "scheduled",
  },
  {
    id: "m8",
    competition: "Ligue 1",
    homeClubId: "paris-saint-germain",
    awayClubId: "marseille",
    kickoff: "2026-08-21T20:45:00",
    venue: "Parc des Princes",
    city: "Paris",
    status: "scheduled",
  },
  {
    id: "m9",
    competition: "Serie A",
    homeClubId: "juventus",
    awayClubId: "ac-milan",
    kickoff: "2026-08-22T19:00:00",
    venue: "Allianz Stadium",
    city: "Turin",
    status: "scheduled",
  },
  {
    id: "m10",
    competition: "Swiss Super League",
    homeClubId: "young-boys",
    awayClubId: "fc-zurich",
    kickoff: "2026-08-23T16:00:00",
    venue: "Wankdorf Stadium",
    city: "Bern",
    status: "scheduled",
  },
  {
    id: "m11",
    competition: "Bundesliga",
    homeClubId: "borussia-dortmund",
    awayClubId: "rb-leipzig",
    kickoff: "2026-08-24T15:30:00",
    venue: "Signal Iduna Park",
    city: "Dortmund",
    status: "scheduled",
  },
];