export type ClubSpotlight = {
  clubId: string;
  title: string;
  summary: string;
  writtenAt: string;
};

// Short news updates for smaller clubs that don't get much regular news
// coverage elsewhere. Each one is about whatever matters most at the club
// that week (results, injuries, managers, transfers, cup runs, milestones),
// written only from facts found in reliable sources (club and league
// sites, national sports media) at the date in "writtenAt" - never
// invented. A club with nothing verifiable is left out rather than shown
// with an old update. Refreshed about every 3 days.
export const clubSpotlights: ClubSpotlight[] = [
  {
    clubId: "moreirense",
    title: "Moreirense beat Amadora, then fall narrowly at Sporting",
    summary: "After winning 3-1 at Estoril, Moreirense beat Estrela da Amadora 2-1 at home on October 31 for back-to-back league wins. They then lost 1-0 at Sporting on November 7. Moreirense are 9th with 14 points after 11 games and host Santa Clara on Saturday, November 28.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "casa-pia",
    title: "Casa Pia take a point at Alverca after Sporting defeat",
    summary: "Casa Pia lost 2-0 at home to Sporting on October 30, then drew 1-1 at Alverca on November 7. They are 16th with 8 points after 11 games, level on points with Marítimo, who have a game in hand. Next up is a home game against Braga on Monday, November 30.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "arouca",
    title: "Arouca's run of 1-0 wins ends at Famalicão",
    summary: "Arouca won three league games in a row, all 1-0: against Estrela da Amadora, at Alverca and against Nacional on November 1. The run ended with a 1-0 defeat at Famalicão on November 6. Arouca are 5th with 20 points after 11 games, level with Académico, and host Rio Ave on Saturday, November 28.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "academico-viseu",
    title: "Académico follow Alvalade win with victory, then slip at Nacional",
    summary: "Académico de Viseu won 2-1 at Sporting on October 25 and followed it with a 2-1 home win over Rio Ave on November 1. They lost 1-0 at Nacional on November 8. Académico are 6th with 20 points after 11 games, level with Arouca, and host Alverca on Saturday, November 28.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "alverca",
    title: "Alverca without a win in three after Casa Pia draw",
    summary: "Alverca lost 1-0 at home to Arouca and 1-0 at Benfica, then drew 1-1 with Casa Pia on November 7. That makes three league games without a win. Alverca are 11th with 12 points after 11 games and travel to Académico de Viseu on Saturday, November 28.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "braga",
    title: "Braga bounce back with two wins and two clean sheets",
    summary: "After a 1-0 defeat at Nacional, Braga beat Famalicão 3-0 at home on November 1 and won 1-0 at Rio Ave on November 8. Braga are 8th with 17 points after 11 games and play at Casa Pia on Monday, November 30.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "estoril-praia",
    title: "Estoril still waiting for a first league win",
    summary: "Estoril lost 3-1 at home to Moreirense and 4-0 at Porto on October 31, and their game against Marítimo has been moved to January 4. They are bottom with 2 points from 10 games and are still without a league win this season. Estoril visit Gil Vicente on Sunday, November 29.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "estrela-amadora",
    title: "Amadora push Benfica but lose a third game in a row",
    summary: "Estrela da Amadora lost 2-0 at home to Casa Pia and 2-1 at Moreirense, then went down 3-2 at home to Benfica on November 8. That is three league defeats in a row. Amadora are 12th with 10 points after 11 games and visit Vitória SC on Saturday, November 28.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "famalicao",
    title: "Famalicão end Arouca's winning run",
    summary: "Famalicão won 4-0 at Rio Ave on October 25 and lost 3-0 at Braga on November 1. They then beat Arouca 1-0 at home on November 6, ending Arouca's three-game winning run. Famalicão are 10th with 13 points after 11 games and visit Benfica on Monday, November 30.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "gil-vicente",
    title: "Gil Vicente win at Santa Clara to climb to 7th",
    summary: "Gil Vicente drew 0-0 with Vitória SC on November 2, then won 2-1 at 4th-placed Santa Clara on November 8. They are 7th with 18 points after 11 games and host bottom side Estoril on Sunday, November 29.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "maritimo",
    title: "Marítimo prepare for a Funchal derby against Nacional",
    summary: "Marítimo lost 5-0 at Vitória SC on October 23 and 2-0 at home to Santa Clara on November 1, and their game at Estoril has been moved to January 4. They are 15th with 8 points from 10 games. Marítimo host Nacional, their Funchal rivals, on Friday, November 27.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "nacional",
    title: "Nacional beat Académico ahead of the Funchal derby",
    summary: "Nacional have won two of their last three league games, both 1-0: against Braga on October 25 and against Académico de Viseu on November 8, with a 1-0 defeat at Arouca in between. They are 13th with 10 points after 11 games and visit Marítimo, their Funchal rivals, on Friday, November 27.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "rio-ave",
    title: "Rio Ave lose three in a row and drop to 17th",
    summary: "Rio Ave lost 4-0 at home to Famalicão, 2-1 at Académico de Viseu and 1-0 at home to Braga on November 8. They are 17th with 7 points after 11 games. Rio Ave visit 5th-placed Arouca on Saturday, November 28.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "santa-clara",
    title: "Santa Clara stay 4th despite home defeat to Gil Vicente",
    summary: "Santa Clara won 2-0 at Marítimo on November 1 but lost 2-1 at home to Gil Vicente on November 8. They are still 4th with 21 points after 11 games, three points behind Sporting in 3rd. Santa Clara visit Moreirense on Saturday, November 28.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "vitoria-sc",
    title: "Vitória SC run Porto close but lose 2-1",
    summary: "Vitória SC beat Marítimo 5-0 on October 23 and drew 0-0 at Gil Vicente on November 2. On November 8 they lost 2-1 at home to unbeaten leaders Porto. Vitória are 14th with 9 points after 11 games and host Estrela da Amadora on Saturday, November 28.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "ado-den-haag",
    title: "ADO win 3-1 under interim coach Levi Schwiebbe",
    summary: "ADO Den Haag lost 1-0 at PEC Zwolle on November 1 and sacked coach Robin Peter the next day, with Levi Schwiebbe taking over as interim. In his first game ADO beat Sparta Rotterdam 3-1 at home on November 7. ADO are 17th with 9 points after 12 games and visit Ajax on Sunday, November 22.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "az-alkmaar",
    title: "AZ edge Groningen 4-3 after defeat at Ajax",
    summary: "AZ lost 1-0 at Ajax on October 31, then beat FC Groningen 4-3 in a seven-goal game on November 8. AZ are 5th with 23 points after 12 games, three behind leaders PSV, and visit Sparta Rotterdam on Sunday, November 22.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "excelsior",
    title: "Excelsior lose 9-0 to Twente, then 1-0 to Go Ahead",
    summary: "Excelsior lost 9-0 at home to FC Twente on November 1, with Wout Weghorst scoring four. A week later they lost 1-0 at home to Go Ahead Eagles. Excelsior are 15th with 11 points after 12 games and visit Feyenoord on Saturday, November 21.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "fc-groningen",
    title: "Groningen lose two high-scoring games in a row",
    summary: "FC Groningen lost 3-2 at home to Sparta Rotterdam on November 1 and 4-3 at AZ on November 8. They are 9th with 15 points after 12 games. Next up is a home game against Heerenveen on Saturday, November 21.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "fc-twente",
    title: "Weghorst scores four as Twente win 9-0 at Excelsior",
    summary: "FC Twente won 9-0 at Excelsior on November 1, with Wout Weghorst scoring four goals, then drew 2-2 at home with Ajax on November 8. Twente are 4th with 24 points after 12 games, two behind leaders PSV, and host Willem II on Sunday, November 22.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "fc-utrecht",
    title: "Utrecht lose to Telstar and NEC",
    summary: "FC Utrecht lost 4-2 at Telstar on November 1 and 3-2 at home to NEC on November 8. They are 14th with 12 points after 12 games and have conceded 34 goals, the second most in the league. Utrecht host Cambuur on Saturday, November 21.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "go-ahead-eagles",
    title: "Go Ahead Eagles win at Excelsior after heavy Cambuur defeat",
    summary: "Go Ahead Eagles lost 4-0 at Cambuur on October 31, then won 1-0 at Excelsior on November 7. They are 8th with 17 points after 12 games and host Fortuna Sittard on Sunday, November 22.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "nec-nijmegen",
    title: "NEC win 3-2 at Utrecht ahead of PSV visit",
    summary: "NEC lost 1-0 at Heerenveen on October 31, then won 3-2 at FC Utrecht on November 8. They are 11th with 14 points after 12 games and host league leaders PSV on Saturday, November 21.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "pec-zwolle",
    title: "PEC Zwolle appoint Alex Pastoor as head coach",
    summary: "PEC Zwolle beat ADO Den Haag 1-0 on November 1 and drew 1-1 at Willem II on November 6. On November 7 the club named Alex Pastoor as head coach, replacing interim coaches Dennis van der Ree and Maikel van der Werff. PEC are 13th with 12 points after 12 games and visit Telstar on Saturday, November 21.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "cambuur",
    title: "Cambuur thrash Go Ahead, then lose to PSV",
    summary: "Cambuur beat Go Ahead Eagles 4-0 at home on October 31. A week later PSV won 5-2 in Leeuwarden, with Sven Mijnans scoring a hat-trick. Cambuur are 10th with 15 points after 12 games and visit FC Utrecht on Saturday, November 21.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "heerenveen",
    title: "Meerveld hat-trick as Heerenveen beat Feyenoord 5-3",
    summary: "Heerenveen beat Feyenoord 5-3 at home on November 8, with Ringo Meerveld scoring three times. It followed a 1-0 home win over NEC, making it two wins in a row. Heerenveen are 6th with 21 points after 12 games and visit FC Groningen on Saturday, November 21.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "sparta-rotterdam",
    title: "Sparta win at Groningen, then lose at ADO",
    summary: "Sparta Rotterdam won 3-2 at FC Groningen on November 1, then lost 3-1 at ADO Den Haag on November 7. Sparta are 12th with 12 points after 12 games and host AZ on Sunday, November 22.",
    writtenAt: "2026-11-13",
  },
  {
    clubId: "willem-ii",
    title: "Willem II draw with PEC under returning coach Streppel",
    summary: "Willem II lost 7-0 at PSV on October 31, after Jurgen Streppel returned as head coach on October 28. They then drew 1-1 at home with PEC Zwolle on November 6. Willem II are bottom with 3 points and are still without a league win after 12 games. They visit FC Twente on Sunday, November 22.",
    writtenAt: "2026-11-13",
  },
];
