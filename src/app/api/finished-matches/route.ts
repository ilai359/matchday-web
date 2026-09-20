import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

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
    const seasonParam = season ? `&season=${season}` : "";
    const response = await fetchWithRetry(
      `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED${seasonParam}`,
      { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 3600 } }
    );
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch finished matches" }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong", details: String(error) }, { status: 500 });
  }
}
