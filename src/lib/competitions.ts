// The set of competitions this app tracks and fetches data for from
// football-data.org. Shared between the matches list route and the
// cache-warming cron job so the two can't drift out of sync with each
// other.
export const COMPETITIONS = ["PL", "PD", "BL1", "FL1", "SA", "CL", "DED", "PPL"];
