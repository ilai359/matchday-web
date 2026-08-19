import { NextResponse } from "next/server";

const COMPETITIONS = ["PL", "PD", "BL1", "FL1", "SA", "CL", "DED", "PPL"];

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const requests = COMPETITIONS.map((code) =>
      fetch(
        `https://api.football-data.org/v4/competitions/${code}/matches?status=SCHEDULED`,
        {
          headers: { "X-Auth-Token": apiKey },
          next: { revalidate: 3600 },
        }
      ).then((res) => (res.ok ? res.json() : { matches: [] }))
    );

    const results = await Promise.all(requests);
    const allMatches = results.flatMap((result) => result.matches ?? []);

    return NextResponse.json({ matches: allMatches });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}