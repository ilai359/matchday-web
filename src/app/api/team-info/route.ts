import { NextResponse } from "next/server";
import { getOrSet } from "@/lib/cache";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

// Used only as a fallback for clubs outside our own 132-club list (e.g. a
// Champions League opponent we don't track) when football-data.org's
// match data itself didn't include a venue. Deliberately returns just the
// stadium name, not a city - football-data.org only gives a club's
// address as one free-text string, not a clean city field, and guessing a
// city out of that text turned out unreliable enough that showing nothing
// is better than risking a wrong one. A club's stadium is essentially
// permanent, so the result is cached for a long time - there's no reason
// to spend our limited football-data.org rate-limit budget re-fetching
// the same club's info on every visit.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing team id" }, { status: 400 });
  }
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }
  try {
    const result = await getOrSet(
      `team-info:${id}`,
      1000 * 60 * 60 * 24 * 30,
      async () => {
        const response = await fetchWithRetry(`https://api.football-data.org/v4/teams/${id}`, {
          headers: { "X-Auth-Token": apiKey },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch team ${id}: ${response.status}`);
        }
        const data = await response.json();
        return { venue: (data.venue as string | null) ?? null };
      }
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
