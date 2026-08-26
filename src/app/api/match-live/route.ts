import { NextResponse } from "next/server";

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
    const response = await fetch(
      `https://api.football-data.org/v4/matches/${id}`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
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