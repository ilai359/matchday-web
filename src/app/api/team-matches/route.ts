import { NextResponse } from "next/server";

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
    const response = await fetch(
      `https://api.football-data.org/v4/teams/${id}/matches?status=SCHEDULED`,
      {
        headers: { "X-Auth-Token": apiKey },
        next: { revalidate: 21600 },
      }
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch team matches" },
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