import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

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
    // A short shared cache rather than no-store: this route is now used
    // for two different things - polling a live match's score (where the
    // client itself only checks every 45s anyway, so a few seconds of
    // extra staleness here is invisible) and looking up any match by id
    // at all, including ones that finished long ago and will never
    // change again (reached e.g. from a club's "Recent form" list).
    // Sharing this across every visitor for a short window costs
    // football-data.org's 10-requests/minute limit far less than an
    // uncached call every single time, with no real freshness downside.
    const response = await fetchWithRetry(
      `https://api.football-data.org/v4/matches/${id}`,
      { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 30 } }
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch live match" },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}