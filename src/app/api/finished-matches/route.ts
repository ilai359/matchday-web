import { NextResponse } from "next/server";
import { getFinishedMatches } from "@/lib/finishedMatchesData";

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
  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition");
  const season = searchParams.get("season");
  if (!competition) {
    return NextResponse.json({ error: "Missing competition code" }, { status: 400 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    // Fetch/cache logic now lives in src/lib/finishedMatchesData.ts,
    // shared with /api/club-bundle - see that file.
    const data = await getFinishedMatches(competition, season, apiKey);
    return NextResponse.json(data);
  } catch (error) {
    console.error(
      `finished-matches failed for competition=${competition} season=${season}`,
      error
    );
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
