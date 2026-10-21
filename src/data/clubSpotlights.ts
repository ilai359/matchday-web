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
    title: "Moreirense out of the cup as captain Dinis Pinto nears return",
    summary: "Moreirense were knocked out of the Taça de Portugal third round with a 1-0 defeat at second-tier AVS on October 17, extending a winless run that followed a 1-1 draw at Vitória SC and a 1-0 home loss to Gil Vicente. Right-back and captain Dinis Pinto, who missed the cup tie with a thigh problem, is close to recovery and expected to be available, while forward Alexandre Parsemain is out after injuring his leg on duty with Martinique. Vasco Botelho da Costa's side are on 8 points after 8 games and visit bottom club Estoril on Sunday, October 25.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "casa-pia",
    title: "Seba Perez sends struggling Casa Pia into the cup fourth round",
    summary: "Seba Perez scored in the 72nd minute as Casa Pia won 1-0 at Alpendorada on October 18 to reach the fourth round of the Taça de Portugal. Filipe Coelho's side went into the tie without injured goalkeeper Andre Gomes and suspended centre-back David Sousa. Casa Pia are 17th with 4 points after 8 games and visit Estrela da Amadora on Saturday, October 24.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "arouca",
    title: "Arouca survive seven-goal cup thriller in Severino's second game",
    summary: "Arouca beat Liga 3 side Belenenses 4-3 after extra time on October 18, with Mansilla scoring twice late in normal time and Mayulu winning it in the 105th minute. It was the second win in two games for new coach Vitor Severino, who replaced Vasco Seabra when Rio Ave paid his release clause, after a 1-0 league debut win over Estrela da Amadora. Arouca are fifth with 14 points after 8 games and visit Alverca on Saturday, October 24.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "academico-viseu",
    title: "Fourth-tier Fatima stun Académico de Viseu in the cup",
    summary: "Promoted Académico de Viseu were knocked out of the Taça de Portugal 1-0 by Campeonato de Portugal side Fatima on October 18, with Lucas Russo scoring in the 84th minute. Coach Bruno Pinheiro had made eleven changes from the league win over Estoril and is expected to bring back regulars such as Andre Clovis for the trip to Sporting. Académico are level on 14 points with Arouca and Gil Vicente after 8 games and visit Sporting on Sunday, October 25.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "alverca",
    title: "Alverca chase club-record fourth straight top-flight win",
    summary: "Alverca can win four top-flight league games in a row for the first time in their history when they host Arouca on Saturday, October 24, after beating Nacional, Rio Ave and Famalicão, the last of those 4-1 away on October 12. Sergio Ferreira's side were knocked out of the Taça de Portugal 2-0 by Tondela after extra time on October 18, and goalkeeper Noah Raveyre is out with a muscle problem. Alverca are eighth with 11 points after 8 games.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "braga",
    title: "Braga sack Carlos Vicens and turn to Franclim Carvalho",
    summary: "Braga sacked Carlos Vicens on October 20, the day after a 2-1 home defeat to Gil Vicente that was their third loss in a row, following defeats to Sporting and Copenhagen. Former Braga assistant Franclim Carvalho, 39, has signed until the end of the season and makes his debut against Gent in the Conference League on Thursday, October 22, with Braga still pointless in the competition. Braga are ninth with 11 points after 8 games and visit Nacional on Sunday, October 25.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "estoril-praia",
    title: "Winless Estoril move on from Vasco Matos and back youngster Turk",
    summary: "Bottom club Estoril began talks on October 15 to end Vasco Matos's contract after two draws and six defeats in the first eight league games. Under-23 coach Sergio Raimundo has taken charge on an interim basis, and Estoril reached the cup fourth round by beating Salgueiros on penalties after a 1-1 draw, with 23-year-old goalkeeper Martin Turk impressing. Estoril are last with 2 points and host Moreirense on Sunday, October 25.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "estrela-amadora",
    title: "Tom Moustier brace takes Estrela into the cup fourth round",
    summary: "Tom Moustier scored twice, in the 65th and 85th minutes, as Estrela da Amadora won 2-1 at Fazendense on October 17 to reach the fourth round of the Taça de Portugal. The win came after a 1-0 league defeat at Arouca in Vitor Severino's first game as Arouca coach. Pepa's side are 10th with 10 points after 8 games and host Casa Pia on Saturday, October 24.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "famalicao",
    title: "Carlos Carvalhal leaves Famalicão after cup shock at Paredes",
    summary: "Carlos Carvalhal left Famalicão by mutual agreement on October 19, hours after a 1-0 Taça de Portugal defeat to Liga 3 side Paredes that followed a 4-1 home league loss to Alverca. Assistant Ricardo Silva has taken over for now. Famalicão are 13th with 7 points after 8 games, still without a home league win, and visit Rio Ave on Sunday, October 25.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "gil-vicente",
    title: "Gil Vicente come from behind at Braga ahead of Porto visit",
    summary: "Gil Vicente won 2-1 at Braga on October 19, as substitute Walace equalised in the 49th minute and a Diogo Travassos own goal won it, a result that cost Braga coach Carlos Vicens his job. It was Luis Pinto's side's third straight win in all competitions, after beating Moreirense in the league and Uniao de Santarem after extra time in the cup. Gil Vicente are level on 14 points with Arouca and Académico after 8 games and host unbeaten leaders FC Porto on Saturday, October 24.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "maritimo",
    title: "Marítimo through in the cup before trip to Guimarães",
    summary: "Promoted Marítimo came from 0-0 at half-time to win 2-1 at Alcochetense on October 18, with Maurice Boakye scoring and Simo Bouzaidi adding a penalty, to reach the Taça de Portugal fourth round. Left-back Nathanael Ogbeta, a summer signing from Barnsley, has recovered from a quad injury and is close to his debut under coach Mitchell van der Gaag. Marítimo are on 8 points after 8 games, level with Moreirense, and visit Vitória SC on Friday, October 23.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "nacional",
    title: "Nacional lose second coach of the season after seven straight defeats",
    summary: "Alexandre Santos left Nacional for Angolan club Petro de Luanda on October 20 after about six weeks in charge, having lost all four of his games, the last a 1-0 cup defeat to fourth-tier Sanjoanense. That was Nacional's seventh straight loss in all competitions, and Santos had replaced Joao Giao, who was sacked in early September. Bruno Abreu takes charge again as interim for Sunday's home game against Braga on October 25, with Nacional 16th on 4 points after 8 games.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "rio-ave",
    title: "Jalen Blesa strikes again as Seabra starts with two wins",
    summary: "Jalen Blesa headed a 94th-minute winner at Louletano in the Taça de Portugal on October 17, a week after his penalty clinched a 3-2 win over Nacional with 10 men in Vasco Seabra's first game as coach. Seabra joined from Arouca in early October after Rio Ave paid his release clause, and Blesa now has four goals this season. Rio Ave are 14th with 7 points after 8 games and host Famalicão on Sunday, October 25.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "santa-clara",
    title: "Unbeaten-in-the-league Santa Clara crash out of the cup at Mafra",
    summary: "Santa Clara, still unbeaten in the league, were knocked out of the Taça de Portugal by Liga 3 side Mafra on October 18, losing 3-2 after extra time to Mamor Niang's 101st-minute winner. Djé Tavares and Fernando had scored for Petit's side, who led twice. Santa Clara are fourth with 18 points after 8 games, level with third-placed Sporting, and host Benfica on Monday, October 26.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "vitoria-sc",
    title: "Top scorer Gustavo Silva back for struggling Vitória SC",
    summary: "Winger Gustavo Silva, Vitória SC's top scorer since 2024, is fully fit again after a thigh injury and could start Friday's home game against Marítimo on October 23. Tiago Margarido's side reached the cup fourth round with a 1-0 win at Lamelas, and Tony Strata, Sidibe and Patrick Ouotro have been cleared after knocks, but Juan Castillo is out for about a month. Vitória are 15th with 5 points after 8 games and have scored only five league goals.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "ado-den-haag",
    title: "ADO stun ten-man PSV with stoppage-time winner",
    summary: "ADO Den Haag got their first win of the season on 17 October, beating champions PSV 2-1. Sven Mijnans put PSV ahead in the 21st minute and was sent off before half-time with a second yellow card. Juho Kilo equalised after the break and substitute Matej Sin headed the winner in the 93rd minute. ADO are 17th with 6 points from 9 matches and host Heerenveen on Saturday 24 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "az-alkmaar",
    title: "AZ get first Europa League win, head to Armenia",
    summary: "AZ beat Hapoel Beer Sheva 2-1 in Alkmaar on 15 October for their first win of the Europa League league phase, after losing 1-0 at Sunderland. Peer Koopmeiners and Mexx Meerdink, with a penalty, scored the goals. Three days later Leeroy Echteld's side only drew 2-2 at ten-man Cambuur. AZ are second with 20 points from 9 matches, play at Ararat Armenia on Thursday and host FC Twente on Sunday 25 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "excelsior",
    title: "Excelsior concede nine in two games as slide continues",
    summary: "Excelsior lost 5-1 at home to FC Groningen on 11 October, a game in which goalkeeper Stijn van Gassel made a costly error. Five days later they lost 4-0 at Heerenveen. That makes one point from their last three league games. Excelsior have dropped to 10th with 11 points from 9 matches and play at Fortuna Sittard on Sunday 25 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "fc-groningen",
    title: "Groningen brought down to earth by 5-2 home loss to Ajax",
    summary: "A week after winning 5-1 at Excelsior, FC Groningen lost 5-2 to Ajax at the Euroborg on 18 October. Ajax led 3-1 before taking control, and Thom van Bergen scored Groningen's second goal but had a stoppage-time penalty saved. Groningen are seventh with 14 points from 9 matches and play at NEC on Sunday 25 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "fc-twente",
    title: "Twente win Conference League opener, then lose to Utrecht",
    summary: "FC Twente opened the Conference League league phase on 15 October by beating FC Thun 1-0. Ramiz Zerrouki scored shortly after Thun's Patrik Kristel was sent off in a disputed decision. On 18 October Twente led Utrecht 1-0 at home but lost 2-1, ending their unbeaten run and missing the chance to go into the top three. Twente are fifth with 17 points from 9 matches and face second-placed AZ away on Sunday 25 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "fc-utrecht",
    title: "Alarcón double and Padt's comeback sink Twente",
    summary: "Angel Alarcón scored twice as Utrecht came from behind to win 2-1 at FC Twente on 18 October, their second league win in a row. Goalkeeper Sergio Padt, 36, played his first Eredivisie match in five years in place of the injured Vasilios Barkas and made several important saves. Utrecht are 11th with 11 points from 9 matches and host PEC Zwolle on Saturday 24 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "go-ahead-eagles",
    title: "Europa League run lifts Go Ahead Eagles to record revenue",
    summary: "On 20 October Go Ahead Eagles published their 2025-26 accounts: net revenue rose from 20.9 million to 27.6 million euros, mainly thanks to the club's Europa League campaign. On the pitch, Go Ahead lost 4-1 at PEC Zwolle on 18 October. They are ninth with 11 points from 9 matches and host Telstar on Friday 23 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "nec-nijmegen",
    title: "Assistant Medunjanin leaves NEC with immediate effect",
    summary: "NEC announced on 20 October that assistant coach Haris Medunjanin is leaving Dick Schreuder's staff with immediate effect, at his own request and for personal reasons. The former Bosnia midfielder had a contract until 2028. NEC drew 2-2 with Fortuna Sittard on 18 October after a late equaliser. They are 12th with 10 points from 9 matches and host FC Groningen on Sunday 25 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "pec-zwolle",
    title: "PEC sack Van der Vegt, then thrash Go Ahead 4-1",
    summary: "On 13 October PEC Zwolle sacked head coach Henry van der Vegt, the first Eredivisie coach to go this season, after a 1-0 home defeat to Cambuur. Five days later, with Dennis van der Ree and Maikel van der Werff in charge for now, PEC came from 1-0 down to beat Go Ahead Eagles 4-1, with Thijs Oosting scoring twice against the team coached by his father. PEC are 15th with 7 points from 9 matches and play at FC Utrecht on Saturday 24 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "cambuur",
    title: "Plat furious with referees after ten-man Cambuur held by AZ",
    summary: "Cambuur led AZ 2-1 through Nicolas Binder and Ilyes Hamache on 18 October but drew 2-2 after Devid Eugene Bouah was sent off for a second yellow card. Mexx Meerdink equalised with an 83rd-minute penalty awarded after a VAR review, and coach Johan Plat said he was fed up with inconsistent decisions. Cambuur are 14th with 9 points from 9 matches and play at bottom side Willem II on Saturday 24 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "heerenveen",
    title: "Vente scores Heerenveen's 1,000th Abe Lenstra goal in 4-0 rout",
    summary: "Heerenveen beat Excelsior 4-0 on 16 October, with goals from Dylan Vente, Oliver Braude, Luca Oyen and Jacob Trenskow. Vente's early penalty was the club's 1,000th Eredivisie goal at the Abe Lenstra Stadion and his first league goal of the season. Heerenveen are eighth with 12 points from 9 matches and play at ADO Den Haag on Saturday 24 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "sparta-rotterdam",
    title: "Sparta mark Het Kasteel's 110th birthday with first home win",
    summary: "On 17 October, the night Het Kasteel celebrated 110 years, Sparta came from behind to beat Willem II 3-2. Jens Toornstra cancelled out Tonny Vilhena's opener, and second-half goals from Martens and Zonneveld won the game, Sparta's first home league win in seven months. Rogier Meijer's side are 13th with 9 points from 9 matches and host Ajax on Sunday 25 October.",
    writtenAt: "2026-10-21",
  },
  {
    clubId: "willem-ii",
    title: "Winless Willem II sack Stegeman, bring back Adrie Koster",
    summary: "Bottom club Willem II sacked head coach John Stegeman on 20 October, with no wins and only two points from nine games. A day later the club named former head coach Adrie Koster, who was working as technical adviser, as interim coach until a permanent replacement is found. His first game is at home to Cambuur on Saturday 24 October.",
    writtenAt: "2026-10-21",
  },
];
