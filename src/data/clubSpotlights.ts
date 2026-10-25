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
    title: "Moreirense look to end two-game skid at winless Estoril",
    summary: "Moreirense visit bottom side Estoril on Sunday, October 25 after back-to-back 1-0 defeats to Gil Vicente and AVS, the second of which knocked them out of the Taça de Portugal. History favours Vasco Botelho da Costa's side, unbeaten in their last six meetings with Estoril, although the coach warned that Estoril do not belong where they are in the table. Moreirense are 12th with 8 points after 8 games.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "casa-pia",
    title: "Casa Pia win Amadora derby 2-0 for second straight away win",
    summary: "Casa Pia won 2-0 at Estrela da Amadora on Saturday, with Benfica loanee João Rego scoring in the 31st minute and Lawrence Ofori adding a long-range goal in stoppage time. It was only their second win of the season, and both have come on the road. Casa Pia are 16th with 7 points after 9 games and host Sporting on Friday, Oct 30.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "arouca",
    title: "Three from three for Vítor Severino as Arouca win at Alverca",
    summary: "Taichi Fukui's 25th-minute goal gave Arouca a 1-0 win at Alverca, who were down to ten men from the sixth minute. It was a third win in three games for new coach Vítor Severino, and Arouca's third league game in a row without defeat. Arouca are 5th with 17 points after 9 games and host Nacional on Sunday, Nov 1.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "academico-viseu",
    title: "850 Académico fans head to Alvalade to chase a 1981 repeat",
    summary: "Académico de Viseu have sold more than 850 tickets for Sunday's game at Sporting on October 25, and Sporting opened an extra away section because of demand. The club's only win at Alvalade came in January 1981, a 1-0 victory with a goal from Águas. Coach Bruno Pinheiro expects a strong start from Sporting. Académico are 6th with 14 points after 8 games.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "alverca",
    title: "Early red card ends Alverca's record bid against Arouca",
    summary: "Alverca's chase for a club-record fourth straight top-flight win ended in a 1-0 home defeat to Arouca after defender Steven Baseya was sent off in the sixth minute. Coach Sérgio Ferreira said the red card completely distorted the game, and the match ended with players and staff from both benches clashing and two more red cards. Alverca are 9th with 11 points after 9 games and visit Benfica on Monday, Nov 2.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "braga",
    title: "Franclim Carvalho's Braga debut ends in 2-0 win over Gent",
    summary: "Braga beat Gent 2-0 in the Conference League on Thursday with goals from Victor Gómez (3') and Gabri Martínez (76'), their first points of the league phase. The win in Franclim Carvalho's first game in charge ended a run of three straight defeats. Braga are 8th with 11 points after 8 games and play at Nacional on Sunday, October 25.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "estoril-praia",
    title: "Estoril reportedly set to keep Sérgio Raimundo as head coach",
    summary: "A Bola reports that Estoril's board is leaning towards making interim coach Sérgio Raimundo, promoted from the under-23s, the permanent replacement for Vasco Matos. Goalkeeper Martin Turk, who saved two penalties in the cup shootout win over Salgueiros, could keep his place. Estoril are the only winless side in the league, last with 2 points after 8 games, and host Moreirense on Sunday, October 25.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "estrela-amadora",
    title: "Estrela lose Amadora derby, now three defeats in a row",
    summary: "Estrela da Amadora lost 2-0 at home to neighbours Casa Pia on Saturday, conceding to João Rego in the first half and to Lawrence Ofori in stoppage time. Pepa's side improved after the break but could not score. It is their third straight defeat and fourth league game without a win. Estrela are 10th with 10 points after 9 games and visit Moreirense on Saturday, Oct 31.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "famalicao",
    title: "Interim boss Ricardo Silva now open to taking Famalicão job",
    summary: "Famalicão have still not named a successor to Carlos Carvalhal. Interim coach Ricardo Silva, who for two years said he did not want to be a head coach, now says he can no longer give that answer and will stay until the board decides. Famalicão are 14th with 7 points after 8 games and visit Rio Ave on Sunday, October 25.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "gil-vicente",
    title: "Gil Vicente fall 1-0 to unbeaten Porto in Barcelos",
    summary: "Gil Vicente lost 1-0 at home to FC Porto on Saturday. Borja Sainz, a late call-up to the starting XI, scored in the 63rd minute and Gil finished with ten men after a late red card. Luís Pinto's side were well organised and threatened on the break, but could not follow up their win at Braga. Gil are 7th with 14 points after 9 games and host Vitória SC on Monday, Nov 2.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "maritimo",
    title: "Van der Gaag after 5-0 rout: We gave up as a team",
    summary: "Marítimo were beaten 5-0 at Vitória SC on Friday, and coach Mitchell van der Gaag said his side gave up after going 2-0 down, which he called worse than the scoreline itself. He said the result showed the team must improve in many areas. Marítimo are 13th with 8 points after 9 games and host Santa Clara on Sunday, Nov 1.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "nacional",
    title: "João Henriques named Nacional's third coach of the season",
    summary: "Nacional have appointed João Henriques, formerly of Marítimo, Santa Clara, Vitória SC, Moreirense and AVS, to replace Alexandre Santos. He follows João Gião and Santos as the club's third head coach this season. Interim coach Bruno Abreu leads the team against Braga on Sunday, October 25. Nacional are 17th with 4 points after 8 games.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "rio-ave",
    title: "Rio Ave chase first top-flight win over Famalicão this century",
    summary: "Rio Ave host Famalicão on Sunday, October 25 without a win in 12 top-flight meetings with them this century: eight draws and four defeats. Vasco Seabra has won his first two games in charge and says he wants his squad to be more demanding. Both sides are on 7 points, with Rio Ave 15th after 8 games.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "santa-clara",
    title: "Unbeaten Santa Clara can leapfrog Benfica",
    summary: "Santa Clara host Benfica on Monday, October 26 still unbeaten in the league and with the joint-best defence, four goals conceded in eight games. A win would take Petit's side above Benfica, who have 19 points. Santa Clara are 4th with 18 points after 8 games.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "vitoria-sc",
    title: "Jakupović brace as Vitória thrash Marítimo 5-0",
    summary: "Vitória SC beat Marítimo 5-0 on Friday to end a five-game winless run in the league. Arnel Jakupović scored twice, the second from a free kick, and an own goal from Paulo Henrique plus goals from Oumar Camara and Yeimar Mosquera completed the rout. Vitória rose from 15th to 11th with 8 points after 9 games and visit Gil Vicente on Monday, Nov 2.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "ado-den-haag",
    title: "Nigel Thomas double not enough as ADO lose to Heerenveen",
    summary: "A week after their late win over PSV, ADO Den Haag lost 3-2 at home to sc Heerenveen on a soaking-wet Saturday night. Substitute Nigel Thomas scored twice to keep ADO in the game, but two goals from Jacob Trenskow and one from Ringo Meerveld were enough for the visitors. ADO are 17th with 6 points after 10 games and visit PEC Zwolle on Sunday 1 November.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "az-alkmaar",
    title: "Patati double as AZ cruise to 4-0 win in Armenia",
    summary: "AZ won 4-0 at Ararat-Armenia on Thursday for their second straight Europa League win. Valdemar Byskov opened the scoring with a free kick, Weslley Patati scored twice and substitute Mexx Meerdink headed in the fourth, while Jordy Clasie stayed home with a calf problem. AZ are second with 20 points after nine league games and host FC Twente on Sunday, October 25.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "excelsior",
    title: "Late Guth header sinks Excelsior in Sittard",
    summary: "Excelsior lost 1-0 at Fortuna Sittard on Sunday after a long goalless afternoon. Fortuna defender Guth headed in a corner from substitute Mohamed Ihattaren in the 86th minute, while Excelsior's Yegoian had earlier missed a big chance to give the visitors the lead. Ruben den Uil's side stay on 11 points after 10 games and host FC Twente on Sunday 1 November.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "fc-groningen",
    title: "Groningen without three players for trip to NEC",
    summary: "Dick Lukkien's FC Groningen travel to NEC on Sunday, October 25 without Tyrique Mercera, Elvis van der Laan and Ryan Metu. They face an NEC side lifted by a 4-2 Europa League win in Zagreb. Groningen are eighth with 14 points after nine games.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "fc-twente",
    title: "Van den Belt double as Twente win 4-1 in Gibraltar",
    summary: "FC Twente beat Lincoln Red Imps 4-1 in Gibraltar on Thursday, making it two wins from two in the Conference League. Thomas van den Belt scored twice and Wout Weghorst and substitute Daouda Weidmann also scored, while 18-year-old Jip Meilink made his first-team debut late on. Twente are sixth with 17 points after nine league games and play at AZ on Sunday, October 25.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "fc-utrecht",
    title: "Van Duijn rescues Utrecht in stoppage time against PEC",
    summary: "Substitute Sem van Duijn scored in the 91st minute to earn FC Utrecht a 1-1 home draw with PEC Zwolle on Saturday, after Elias Sorensen had put the visitors ahead on 72 minutes. Utrecht had most of the ball but created few clear chances. They are 11th with 12 points after 10 games and visit Telstar on Sunday 1 November.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "go-ahead-eagles",
    title: "Tengstedt double ends Go Ahead's winless run as Cillessen arrives",
    summary: "Go Ahead Eagles beat Telstar 3-2 on Friday for their first league win in seven matches, with Eredivisie top scorer Soren Tengstedt scoring twice to take his total to eight. Earlier in the week the club signed former Netherlands goalkeeper Jasper Cillessen as a free agent until the end of the season because of Nick Marsman's injury. Go Ahead are ninth with 14 points after 10 games and visit Cambuur on Saturday 31 October.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "nec-nijmegen",
    title: "Chery double as NEC stun Dinamo Zagreb 4-2",
    summary: "NEC won 4-2 at Dinamo Zagreb on Thursday for their first win of this Europa League campaign, after losing 5-0 at Juventus and drawing with Levski Sofia. Clement Bischoff and Bryan Linssen scored and Tjaronn Chery got two, while Dusan Tadic missed out injured. Dick Schreuder's side are 13th with 10 points after nine league games and host FC Groningen on Sunday, October 25.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "pec-zwolle",
    title: "PEC denied win at Utrecht as coach search goes on",
    summary: "PEC Zwolle were seconds away from a win at FC Utrecht on Saturday until Sem van Duijn cancelled out Elias Sorensen's goal in stoppage time, leaving it 1-1. Interim coach Dennis van der Ree said before the game that now is not the right time for him to take the job permanently, so the club is still looking for Henry van der Vegt's successor. PEC are 15th with 8 points after 10 games and host ADO Den Haag on Sunday 1 November.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "cambuur",
    title: "Cambuur equal biggest Eredivisie win with 6-1 rout in Tilburg",
    summary: "SC Cambuur thrashed Willem II 6-1 away on Saturday to equal their biggest Eredivisie win and set a club record for an away win. They led 3-0 after 18 minutes, their fastest ever, and striker Nicolas Binder scored twice. Cambuur are unbeaten in six and tenth with 12 points after 10 games; they host Go Ahead Eagles on Saturday 31 October.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "heerenveen",
    title: "Trenskow double gives Heerenveen win in Hague downpour",
    summary: "Jacob Trenskow scored twice and Ringo Meerveld added another as sc Heerenveen won 3-2 at ADO Den Haag on Saturday in heavy rain. Two goals from ADO substitute Nigel Thomas made for a nervous finish, but Robin Veldman's side held on for their third win in four games. Heerenveen are seventh with 15 points after 10 games and host NEC on Saturday 31 October.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "sparta-rotterdam",
    title: "Sparta chase first win over Ajax in 16 years",
    summary: "Sparta host Ajax at Het Kasteel on Sunday, October 25, still waiting for a first win over Ajax in 16 years, according to the club. Rogier Meijer is missing only Shunsuke Mito, and striker Milan Zonneveld already has six league goals. Sparta are 14th with 9 points after nine games, while Ajax come in after a 2-0 Conference League win over Atalanta.",
    writtenAt: "2026-10-25",
  },
  {
    clubId: "willem-ii",
    title: "Koster's return turns sour as Willem II crash 6-1 to Cambuur",
    summary: "Adrie Koster's first game back as interim coach ended in a 6-1 home defeat by SC Cambuur on Saturday, with Willem II already 3-0 down after 18 minutes. Koster, 71, is the oldest coach in the Eredivisie and is filling in while the club looks for a permanent successor to John Stegeman. Willem II are bottom with 2 points after 10 games and still without a win; they visit PSV on Saturday 31 October.",
    writtenAt: "2026-10-25",
  },
];
