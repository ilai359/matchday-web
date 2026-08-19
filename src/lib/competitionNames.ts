// football-data.org uses its own official names for some competitions,
// which don't always match how we want to display them in the app.
// This maps their names to the ones we want users to see.
const COMPETITION_DISPLAY_NAMES: Record<string, string> = {
  "Primera Division": "La Liga",
};

export function formatCompetition(name: string): string {
  return COMPETITION_DISPLAY_NAMES[name] ?? name;
}