export type ClubSpotlight = {
  clubId: string;
  title: string;
  summary: string;
  writtenAt: string;
};

// These are short, factual club updates for clubs that don't get much
// regular news coverage (see NOTES.md) - written from real league table
// standings, real match results, and real upcoming fixtures (checked via
// web research at the time listed in "writtenAt"), not invented. Deliberately
// kept to verifiable facts only (position, points, results, fixtures) - no
// manager names, player stats, or quotes, since those couldn't be reliably
// re-verified for every one of these clubs and getting them wrong would be
// worse than leaving them out. Replace these every few days so they don't
// go stale like the previous batch did.
export const clubSpotlights: ClubSpotlight[] = [
  {
    clubId: "moreirense",
    title: "Moreirense held to a draw at Vitória SC, sit 12th",
    summary: "Moreirense were held to a 1-1 draw away at Vitória SC in their last league outing, leaving them 12th in the Primeira Liga with 8 points from seven matches. They're next in action at home to 9th-placed Gil Vicente on 9 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "casa-pia",
    title: "Casa Pia snap their long winless run with a win at Estoril",
    summary: "Casa Pia won 2-1 away at Estoril Praia in their last league match - their only victory of the season so far. It leaves them 17th in the Primeira Liga on 4 points from seven games. They host 4th-placed Santa Clara on 10 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "arouca",
    title: "Arouca share the points at Sporting, stay fifth",
    summary: "Arouca drew 2-2 away at Sporting CP in their last league match, a result that keeps them 5th in the Primeira Liga with 11 points from seven games. They're back in action at home to 8th-placed Estrela da Amadora on 11 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "academico-viseu",
    title: "Académico de Viseu make it three straight wins, climb to 7th",
    summary: "Académico de Viseu won 2-0 away at Estrela da Amadora in their last league match, their third consecutive league victory. That has them up to 7th in the Primeira Liga with 11 points from seven matches. They host bottom-placed Estoril Praia on 10 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "alverca",
    title: "Alverca edge Rio Ave at home, sit 10th",
    summary: "Alverca beat Rio Ave 1-0 at home in their last league outing, a result that has them 10th in the Primeira Liga with 8 points from seven matches. They travel to face 13th-placed Famalicão on 12 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "braga",
    title: "Braga held goalless at Santa Clara, sixth with a game in hand",
    summary: "Braga were held to a 0-0 draw away at Santa Clara in their last league match, leaving them 6th in the Primeira Liga on 11 points from six matches - one fewer than most of the pack around them. They host Sporting CP on 9 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "estoril-praia",
    title: "Estoril slip to bottom after home defeat to Casa Pia",
    summary: "Estoril Praia lost 1-2 at home to Casa Pia in their last league match, leaving them bottom of the Primeira Liga with 2 points from seven games. They travel to face 7th-placed Académico de Viseu on 10 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "estrela-amadora",
    title: "Estrela da Amadora suffer their first defeat of the season, stay 8th",
    summary: "Estrela da Amadora lost 0-2 at home to Académico de Viseu in their last league match - their first league defeat of the campaign. They remain 8th in the Primeira Liga with 10 points from seven games. They travel to face 5th-placed Arouca on 11 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "famalicao",
    title: "Famalicão thrash Nacional 4-0, but stay 13th",
    summary: "Famalicão won 4-0 away at Nacional in their last league match, their biggest win of the season. It leaves them 13th in the Primeira Liga with 7 points from seven games. They host 10th-placed Alverca on 12 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "gil-vicente",
    title: "Gil Vicente held at home by Marítimo, sit ninth with games in hand",
    summary: "Gil Vicente were held 1-1 at home by Marítimo in their last league match, leaving them 9th in the Primeira Liga with 8 points from six matches, fewer games played than most of the division. They travel to face 12th-placed Moreirense on 9 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "maritimo",
    title: "Marítimo held by Gil Vicente, host league leaders Porto next",
    summary: "Marítimo drew 1-1 away at Gil Vicente in their last league match, leaving them 11th in the Primeira Liga with 8 points from seven games. They host league leaders Porto on 10 October in a daunting test.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "nacional",
    title: "Nacional thumped 4-0 by Famalicão, drop to 15th",
    summary: "CD Nacional were beaten 4-0 at home by Famalicão in their last league match, leaving them 15th in the Primeira Liga with 4 points from seven games. They travel to face 16th-placed Rio Ave on 11 October in a relegation-zone clash.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "rio-ave",
    title: "Rio Ave beaten at Alverca, stuck in the bottom four",
    summary: "Rio Ave lost 1-0 away at Alverca in their last league match, leaving them 16th in the Primeira Liga with 4 points from seven games. They host 15th-placed Nacional on 11 October in a direct relegation-zone clash.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "santa-clara",
    title: "Santa Clara held goalless by Braga, stay fourth",
    summary: "Santa Clara were held to a 0-0 draw at home by Braga in their last league match, leaving them 4th in the Primeira Liga with 15 points from seven games. They travel to face 17th-placed Casa Pia on 10 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "vitoria-sc",
    title: "Vitória SC held by Moreirense, remain 14th ahead of trip to Benfica",
    summary: "Vitória SC were held 1-1 at home by Moreirense in their last league match, leaving them 14th in the Primeira Liga with 5 points from seven games. They face a tough trip to 2nd-placed Benfica on 11 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "ado-den-haag",
    title: "ADO Den Haag grab a point but stay 17th after Cambuur draw",
    summary: "ADO Den Haag drew 1-1 at home with fellow strugglers SC Cambuur, leaving them 17th in the Eredivisie with 2 points from seven matches and still without a league win this season. After the international break, they travel to Telstar on 11 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "az-alkmaar",
    title: "AZ Alkmaar stay top of the Eredivisie after edging past Telstar",
    summary: "AZ Alkmaar ground out a 1-0 home win over Telstar to remain top of the Eredivisie on 19 points from seven matches, still unbeaten this season. Their toughest test yet follows the international break, away at second-placed Feyenoord on 10 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "excelsior",
    title: "Excelsior share the points at Ajax, sit 7th",
    summary: "Excelsior came away from Amsterdam with a 2-2 draw at Ajax, leaving them 7th in the Eredivisie on 11 points from seven games. They're back in action on 11 October, once the international break ends, hosting fellow mid-table side FC Groningen.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "fc-groningen",
    title: "FC Groningen thrash PEC Zwolle to move into 8th",
    summary: "FC Groningen eased to a 3-0 home win over PEC Zwolle, moving up to 8th in the Eredivisie with 11 points from seven matches. They travel to Excelsior on 11 October, after the international break, in a meeting of two closely-matched mid-table sides.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "fc-twente",
    title: "FC Twente stun PSV Eindhoven to stay 4th",
    summary: "FC Twente beat title-chasing PSV Eindhoven 3-2 at home, handing them their first league defeat of the season and keeping Twente 4th on 16 points from seven matches. After the international break, they travel to Fortuna Sittard on 10 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "fc-utrecht",
    title: "FC Utrecht thumped 5-0 at Feyenoord, stuck near the bottom",
    summary: "FC Utrecht were beaten 5-0 away at Feyenoord, a result that leaves them 15th in the Eredivisie with just 5 points from seven matches. They host fellow strugglers Willem II on 11 October, once the international break wraps up.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "go-ahead-eagles",
    title: "Go Ahead Eagles held by NEC, stay 9th",
    summary: "Go Ahead Eagles were held to a 1-1 draw away at NEC Nijmegen, leaving them 9th in the Eredivisie on 10 points from seven matches. They host struggling Sparta Rotterdam on 10 October, after the international break.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "nec-nijmegen",
    title: "NEC Nijmegen draw with Go Ahead Eagles, sit 11th",
    summary: "NEC Nijmegen shared the points in a 1-1 home draw with Go Ahead Eagles, leaving them 11th in the Eredivisie with 8 points from seven matches. A tough trip awaits after the international break, away at fifth-placed Ajax on 10 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "pec-zwolle",
    title: "PEC Zwolle beaten at Groningen, stay 16th",
    summary: "PEC Zwolle lost 3-0 away at FC Groningen, leaving them 16th in the Eredivisie with 4 points from seven matches. They host fellow relegation-battlers SC Cambuur on 11 October, after the international break, in a direct clash near the bottom of the table.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "cambuur",
    title: "SC Cambuur draw at ADO Den Haag, stay 14th",
    summary: "SC Cambuur picked up a point in a 1-1 draw away at ADO Den Haag, leaving them 14th in the Eredivisie with 5 points from seven matches. They're back in action on 11 October, after the international break, away at fellow strugglers PEC Zwolle.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "heerenveen",
    title: "SC Heerenveen thrash Sparta Rotterdam, climb to 10th",
    summary: "SC Heerenveen ran out convincing 4-0 winners away at Sparta Rotterdam, moving up to 10th in the Eredivisie with 9 points from seven matches. A much sterner test follows the international break, away at third-placed PSV Eindhoven on 9 October.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "sparta-rotterdam",
    title: "Sparta Rotterdam thumped 4-0 at home by Heerenveen, down in 12th",
    summary: "Sparta Rotterdam were beaten 0-4 at home by SC Heerenveen, leaving them 12th in the Eredivisie with 5 points from seven matches. They travel to Go Ahead Eagles on 10 October, after the international break, looking to arrest a difficult run of form.",
    writtenAt: "2026-09-24",
  },
  {
    clubId: "willem-ii",
    title: "Willem II beaten by Fortuna Sittard, prop up the table",
    summary: "Willem II lost 0-1 at home to Fortuna Sittard, leaving them bottom of the Eredivisie with 2 points from seven matches. They face fellow strugglers FC Utrecht away on 11 October, after the international break, in a clash between two of the league's bottom three.",
    writtenAt: "2026-09-24",
  },
];
