import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

export async function GET(request: Request) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition");
  if (!competition) {
    return NextResponse.json(
      { error: "Missing competition code" },
      { status: 400 }
    );
  }

  try {
    const response = await fetchWithRetry(
      `https://api.football-data.org/v4/competitions/${competition}/scorers?limit=100`,
      {
        headers: { "X-Auth-Token": apiKey },
        // Goal/assist tallies only change once a match actually finishes,
        // and matches aren't continuous - refreshing hourly around the
        // clock was checking far more often than the data could ever
        // actually change. 6 hours still catches updates several times a
        // day without polling for no reason overnight or between
        // matchdays.
        next: { revalidate: 21600 },
      }
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch scorers" },
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