import { NextResponse } from "next/server";
import { cdnCacheHeaders } from "@/lib/httpCache";
import { getOrSet } from "@/lib/cache";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

// Runs on Vercel's Edge Runtime instead of the default Node.js serverless
// runtime. This route only does fetch() calls and talks to Upstash Redis over
// its REST API (@upstash/redis) - no Node-only APIs (crypto, fs, the web-push
// library) - so it's safe to run on the edge. The payoff: on a low-traffic app
// like this one, functions sit cold between visits most of the day, and edge
// functions start markedly faster from cold than Node serverless functions do,
// plus they run from a location close to the visitor instead of one fixed
// region. Routes that need Node-only APIs (check-goals, push/test, anything
// touching src/lib/pushSubscriptions.ts) intentionally stay on the default
// runtime.
export const runtime = "edge";


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
      },
      { serveStale: true }
    );
    return NextResponse.json(result, { headers: cdnCacheHeaders(86400) });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
