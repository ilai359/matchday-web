import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getOrSet } from "@/lib/cache";

export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing match id" }, { status: 400 });
  }
  try {
    // Same reasoning as standings/route.ts: getOrSet falls back to the
    // last known-good match data instead of showing nothing when a live
    // request lands during football-data.org's shared rate limit.
    const data = await getOrSet(`match-live:${id}`, 30 * 1000, async () => {
      const response = await fetchWithRetry(
        `https://api.football-data.org/v4/matches/${id}`,
        { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`football-data.org returned ${response.status}`);
      }
      return response.json();
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error(`match-live failed for id=${id}`, error);
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
