export type UpdateCategory =
  | "Club"
  | "Injury"
  | "Transfer"
  | "Press"
  | "Fixture"
  | "Match";

export type Update = {
  id: string;
  clubId: string;
  category: UpdateCategory;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
};

export const updates: Update[] = [
  {
    id: "u1",
    clubId: "arsenal",
    category: "Injury",
    title: "Saka returns to training",
    summary: "The winger returned to team training ahead of Saturday's match.",
    source: "BBC Sport",
    publishedAt: "2026-08-12T10:00:00",
  },
  {
    id: "u2",
    clubId: "real-madrid",
    category: "Press",
    title: "Manager speaks ahead of Valencia",
    summary: "The head coach discussed squad rotation and fitness updates.",
    source: "Marca",
    publishedAt: "2026-08-12T08:00:00",
  },
  {
    id: "u3",
    clubId: "fc-zurich",
    category: "Fixture",
    title: "Sunday kickoff time confirmed",
    summary: "The match against FC Basel will kick off at 16:30 as planned.",
    source: "SFL",
    publishedAt: "2026-08-12T06:00:00",
  },
  {
    id: "u4",
    clubId: "barcelona",
    category: "Transfer",
    title: "Club confirms new signing",
    summary: "Barcelona have completed the signing of a new midfielder.",
    source: "Sport",
    publishedAt: "2026-08-11T18:00:00",
  },
  {
    id: "u5",
    clubId: "bayern-munich",
    category: "Club",
    title: "Squad update ahead of Dortmund clash",
    summary: "Two players return from injury ahead of the weekend fixture.",
    source: "Bundesliga.com",
    publishedAt: "2026-08-11T15:00:00",
  },
  {
    id: "u6",
    clubId: "liverpool",
    category: "Injury",
    title: "Midfielder faces spell on sidelines",
    summary: "Scan results confirm a hamstring issue picked up in training.",
    source: "Liverpool Echo",
    publishedAt: "2026-08-11T12:00:00",
  },
  {
    id: "u7",
    clubId: "manchester-city",
    category: "Transfer",
    title: "Club linked with January move",
    summary: "Reports suggest interest in strengthening the midfield in January.",
    source: "The Athletic",
    publishedAt: "2026-08-10T14:00:00",
  },
  {
    id: "u8",
    clubId: "paris-saint-germain",
    category: "Press",
    title: "Coach previews Marseille clash",
    summary: "The manager addressed the media ahead of this weekend's derby.",
    source: "L'Équipe",
    publishedAt: "2026-08-10T11:00:00",
  },
  {
    id: "u9",
    clubId: "juventus",
    category: "Fixture",
    title: "Kickoff time moved for TV broadcast",
    summary: "The match against AC Milan has been rescheduled to 19:00.",
    source: "Gazzetta dello Sport",
    publishedAt: "2026-08-10T09:00:00",
  },
  {
    id: "u10",
    clubId: "young-boys",
    category: "Club",
    title: "New captain announced",
    summary: "The club has named a new captain for the upcoming season.",
    source: "SFL",
    publishedAt: "2026-08-09T13:00:00",
  },
  {
    id: "u11",
    clubId: "borussia-dortmund",
    category: "Match",
    title: "Team news ahead of Bayern clash",
    summary: "Two key players expected to return to the starting lineup.",
    source: "Bundesliga.com",
    publishedAt: "2026-08-09T10:00:00",
  },
];