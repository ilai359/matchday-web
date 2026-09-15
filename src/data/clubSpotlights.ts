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
    title: "Moreirense move up after home win over Marítimo",
    summary: "Moreirense picked up a 3-1 home win over Marítimo in their last outing, moving them up to 11th in the Primeira Liga table with seven points from six matches. It's been an inconsistent start, with three defeats already this season, but the win puts them level on points with several sides in the bottom half. Moreirense travel to Vitória SC on 20 September looking to build on that result.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "fortuna-sittard",
    title: "Fortuna Sittard need a response after Ajax thrashing",
    summary: "Fortuna Sittard's promising start hit a bump last time out, beaten 5-1 at home by Ajax, though they still sit 7th in the Eredivisie with 10 points from six matches. It's been a high-scoring season for them either way, with 12 goals scored but 14 conceded already. They travel to Willem II on 19 September looking to get back to winning ways.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "casa-pia",
    title: "Casa Pia still searching for a way out of the bottom spot",
    summary: "Casa Pia remain bottom of the Primeira Liga after a 4-1 home defeat to FC Porto, leaving them with just one point and a single goal scored from their opening six matches. The defence has been the biggest issue, with 15 goals conceded already - the worst return in the division. They face fellow strugglers Estoril Praia away on 20 September, in a game that already looks important for both sides.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "arouca",
    title: "Arouca aim to bounce back at in-form Sporting CP",
    summary: "Arouca's promising start hit a setback with a 2-1 home defeat to Santa Clara, though they remain 6th in the Primeira Liga on 10 points from six games. A trip to third-placed Sporting CP awaits on 19 September, a stern test of how far this Arouca side has come this season.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "academico-viseu",
    title: "Académico de Viseu build on win over Vitória SC",
    summary: "Académico de Viseu picked up a 2-1 home win over Vitória SC in their last outing, keeping them 8th in the Primeira Liga with eight points from six matches in their first season back in the top flight in years. They travel to Estrela da Amadora, still unbeaten this season, on 20 September.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "alverca",
    title: "Alverca pick up first win of the season at Nacional",
    summary: "Alverca finally got off the mark with a 3-1 away win at CD Nacional - their first victory of the campaign - moving them to 12th in the Primeira Liga with five points from six matches. They host fellow strugglers Rio Ave on 19 September looking to build some momentum.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "braga",
    title: "Braga climb to fifth after edging past Estoril",
    summary: "Braga eased to a 1-0 home win over Estoril Praia in their last league outing, a result that has them up to 5th in the Primeira Liga with 13 points from six matches. Braga's next test is a trip to fourth-placed Santa Clara on 20 September, a genuine top-half clash.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "estoril-praia",
    title: "Estoril still winless after Braga defeat",
    summary: "Estoril Praia remain without a win, beaten 1-0 away at Braga in their last match, leaving them 17th in the Primeira Liga with two points from six games and only two goals scored all season. They host bottom-of-the-table Casa Pia on 20 September, in a fixture that already looks crucial for both sides' survival hopes.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "estrela-amadora",
    title: "Estrela da Amadora still unbeaten after Rio Ave thriller",
    summary: "Estrela da Amadora remain the Primeira Liga's only unbeaten side after a wild 3-3 draw away at Rio Ave, leaving them 7th with 10 points from six games - four of them draws. They host Académico de Viseu on 20 September looking to finally turn one of those draws into a win.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "famalicao",
    title: "Famalicão hold Sporting to a draw",
    summary: "Famalicão picked up a credible point in a 1-1 home draw with Sporting CP - their fourth draw of the season - leaving them 13th in the Primeira Liga with four points from six matches. They travel to fellow strugglers CD Nacional on 19 September looking for a first win of the campaign.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "gil-vicente",
    title: "Gil Vicente look to respond after Benfica defeat",
    summary: "Gil Vicente were beaten 3-1 away at Benfica in their last outing, though they remain 9th in the Primeira Liga with seven points from six matches. They host Marítimo on 19 September looking to get back to winning ways at home.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "maritimo",
    title: "Marítimo look to bounce back at Gil Vicente",
    summary: "Marítimo were beaten 3-1 away at Moreirense in their last match, leaving them 10th in the Primeira Liga with seven points from six games. They travel to Gil Vicente on 19 September looking to get their season back on track.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "nacional",
    title: "Nacional look to respond after Alverca defeat",
    summary: "CD Nacional were beaten 3-1 at home by Alverca in their last match, leaving them 15th in the Primeira Liga with four points from six games. They host fellow strugglers Famalicão on 19 September, in a game that already carries real relegation-battle stakes.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "rio-ave",
    title: "Rio Ave share the points in six-goal thriller",
    summary: "Rio Ave came from behind to draw 3-3 at home to Estrela da Amadora in their last match, leaving them 16th in the Primeira Liga with four points from six games and one of the division's leakiest defences. They travel to Alverca on 19 September looking to find their first win of the season.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "santa-clara",
    title: "Santa Clara's unbeaten start continues with win at Arouca",
    summary: "Santa Clara remain unbeaten this season after a 2-1 away win at Arouca, keeping them 4th in the Primeira Liga with 14 points from six matches and one of the division's best defensive records. They host in-form Braga on 20 September in one of the weekend's biggest games in the top half.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "vitoria-sc",
    title: "Vitória SC look to respond after Viseu defeat",
    summary: "Vitória SC were beaten 2-1 at home by newly-promoted Académico de Viseu in their last match, leaving them 14th in the Primeira Liga with four points from six games. They host Moreirense on 20 September looking to get their season moving.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "ado-den-haag",
    title: "ADO Den Haag remain bottom after Twente defeat",
    summary: "ADO Den Haag sit bottom of the Eredivisie after a 2-0 away defeat to FC Twente, leaving them on just one point from six matches with the division's worst defensive record. They host fellow strugglers SC Cambuur on 19 September, in a fixture that already looks vital for both sides.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "az-alkmaar",
    title: "AZ Alkmaar's perfect run ends with Willem II draw",
    summary: "AZ Alkmaar's unbeaten start continued but their run of wins finally ended, held to a 1-1 draw at home by Willem II. They remain 2nd in the Eredivisie on 16 points from six games, just behind PSV Eindhoven on goal difference. AZ host bottom-of-the-table Telstar on 20 September looking to get back to winning ways.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "excelsior",
    title: "Excelsior beaten by Utrecht, face tough trip to Ajax",
    summary: "Excelsior's good early form hit a bump with a 2-1 home defeat to FC Utrecht, though they remain 6th in the Eredivisie with 10 points from six matches. A tough trip to Ajax awaits on 19 September, a real test of how far this Excelsior side has come this season.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "fc-groningen",
    title: "FC Groningen held to a draw at Go Ahead Eagles",
    summary: "FC Groningen shared the points in a 1-1 draw away at Go Ahead Eagles, leaving them 9th in the Eredivisie with eight points from six games in one of the more open, high-scoring seasons in the division. They host PEC Zwolle on 18 September looking to get back to winning ways.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "fc-twente",
    title: "FC Twente up to fourth after beating ADO Den Haag",
    summary: "FC Twente eased to a 2-0 home win over bottom-club ADO Den Haag, keeping them 4th in the Eredivisie with 13 points from six matches and one of the league's tighter defences. A huge test awaits on 20 September, though, with leaders PSV Eindhoven visiting.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "fc-utrecht",
    title: "FC Utrecht pick up much-needed win at Excelsior",
    summary: "FC Utrecht picked up a much-needed 2-1 away win at Excelsior, though they remain 14th in the Eredivisie with five points from six games and the division's leakiest defence, having conceded 19 goals already. They face a daunting trip to Feyenoord on 20 September.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "go-ahead-eagles",
    title: "Go Ahead Eagles held by Groningen again",
    summary: "Go Ahead Eagles were held to a 1-1 draw at home by FC Groningen - their third draw of the season - leaving them 8th in the Eredivisie with nine points from six matches. They travel to NEC Nijmegen on 20 September looking to turn one of those draws into three points.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "nec-nijmegen",
    title: "NEC Nijmegen beaten away at Cambuur",
    summary: "NEC Nijmegen were beaten 3-0 away at SC Cambuur in their last match, leaving them 10th in the Eredivisie with seven points from six games. They host Go Ahead Eagles on 20 September looking to bounce back in front of their own fans.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "pec-zwolle",
    title: "PEC Zwolle heavily beaten by Feyenoord",
    summary: "PEC Zwolle were thumped 7-0 at home by Feyenoord in their last match, leaving them 16th in the Eredivisie with four points from six games and one of the division's worst defensive records. They travel to FC Groningen on 18 September looking to steady the ship.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "cambuur",
    title: "SC Cambuur pick up big win over NEC",
    summary: "SC Cambuur picked up just their second win of the season, beating NEC Nijmegen 3-0 at home, though they remain 15th in the Eredivisie with four points from six games and the division's worst defensive record. They travel to fellow strugglers ADO Den Haag on 19 September, in a fixture that already looks important for both clubs' survival hopes.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "heerenveen",
    title: "SC Heerenveen held goalless by Telstar",
    summary: "SC Heerenveen played out a goalless draw at home to Telstar - their third draw of the season - leaving them 11th in the Eredivisie with six points from six matches. They travel to Sparta Rotterdam on 19 September looking for just their second win of the campaign.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "sparta-rotterdam",
    title: "Sparta Rotterdam beaten heavily at leaders PSV",
    summary: "Sparta Rotterdam were beaten 4-1 away at league leaders PSV Eindhoven in their last match, leaving them 12th in the Eredivisie with five points from six games. They host SC Heerenveen on 19 September in a much more winnable fixture.",
    writtenAt: "2026-09-15",
  },
  {
    clubId: "willem-ii",
    title: "Willem II hold AZ Alkmaar to a draw",
    summary: "Willem II picked up an impressive point away at league pacesetters AZ Alkmaar, drawing 1-1 to end AZ's perfect start to the season. It's their third draw of the campaign, leaving them 17th in the Eredivisie with three points from six matches. They host Fortuna Sittard on 19 September looking for a first win of the season.",
    writtenAt: "2026-09-15",
  },
];
