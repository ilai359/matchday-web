import { NextResponse } from "next/server";
import { cdnCacheHeaders } from "@/lib/httpCache";
import { slimMatchesResponse } from "@/lib/slimFootballData";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";

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


export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing team id" }, { status: 400 });
  }
  try {
    // Same reasoning as standings/route.ts: getOrSet falls back to the
    // last known-good fixture list instead of showing nothing when a live
    // request lands during football-data.org's shared rate limit.
    const data = await getOrSet(
      `team-matches:${id}`,
      6 * 60 * 60 * 1000,
      async () => {
        const response = await fetchWithRetry(
          `https://api.football-data.org/v4/teams/${id}/matches?status=SCHEDULED`,
          { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`football-data.org returned ${response.status}`);
        }
        return slimMatchesResponse(await response.json());
      }
    );
    return NextResponse.json(data, { headers: cdnCacheHeaders(180) });
  } catch (error) {
    console.error(`team-matches failed for id=${id}`, error);
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
