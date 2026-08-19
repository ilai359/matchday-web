import { NextResponse } from "next/server";

const COMPETITIONS = ["PL", "PD", "BL1", "FL1", "SA", "CL", "DED", "PPL"];

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const requests = COMPETITIONS.map((code) =>
      fetch(`https://api.football-data.org/v4/competitions/${code}/teams`, {
        headers: { "X-Auth-Token": apiKey },
        next: { revalidate: 86400 },
      }).then((res) => (res.ok ? res.json() : { teams: [] }))
    );

    const results = await Promise.all(requests);
    const allTeams = results.flatMap((r) => r.teams ?? []);

    // Just the essentials: name + crest URL
    const simplified = allTeams.map((t: { name: string; crest: string }) => ({
      name: t.name,
      crest: t.crest,
    }));

    return NextResponse.json({ teams: simplified });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}