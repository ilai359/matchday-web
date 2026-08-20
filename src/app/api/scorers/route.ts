import { NextResponse } from "next/server";

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
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${competition}/scorers?limit=25`,
      {
        headers: { "X-Auth-Token": apiKey },
        next: { revalidate: 3600 },
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