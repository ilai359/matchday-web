import { clubs } from "../data/clubs";

export function getClub(id: string) {
  return clubs.find((club) => club.id === id);
}

export function getClubName(id: string) {
  const club = getClub(id);
  return club ? club.name : id;
}

export function clubInitials(name: string) {
  const words = name.trim().split(" ");
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

// Cleans up a raw API team name for display.
// If it matches a known club, use our short name. Otherwise, strip
// common suffixes/prefixes like "FC", "CF", "AFC", "de Portugal".
export function displayName(rawName: string, clubId?: string): string {
  if (clubId) {
    const club = getClub(clubId);
    if (club) return club.shortName;
  }

  return rawName
    .replace(/\bClube de Portugal\b/i, "")
    .replace(/\bde Barcelona\b/i, "")
    .replace(/\b(FC|CF|AFC|SC|SL|RCD|BSC)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}