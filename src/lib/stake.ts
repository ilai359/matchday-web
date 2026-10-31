// "What's at stake": one short line for a league match, worked out from
// the current table - e.g. "Win → Bayern go top". Only says something
// when a win would actually change something worth saying.

import type { StandingsRow } from "./footballApi";

function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function stakeLine(
  standings: StandingsRow[],
  clubId: string | null | undefined,
  clubName: string
): string | null {
  if (!clubId || standings.length === 0) return null;
  const row = standings.find((r) => r.clubId === clubId);
  if (!row) return null;

  // Where the club would be with 3 more points (and one more goal of
  // difference), if nobody else's result changed.
  const points = row.points + 3;
  const goalDifference = row.goalDifference + 1;
  const above = standings.filter(
    (r) =>
      r.clubId !== clubId &&
      (r.points > points || (r.points === points && r.goalDifference > goalDifference))
  ).length;
  const position = above + 1;

  if (position < row.position) {
    return position === 1
      ? `📈 Win → ${clubName} go top`
      : `📈 Win → ${clubName} up to ${ordinal(position)}`;
  }
  if (row.position === 1) return `👑 Win → ${clubName} stay top`;
  return null;
}
