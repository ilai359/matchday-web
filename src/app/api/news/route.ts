import { NextResponse } from "next/server";

const LEAGUE_QUERIES = [
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Ligue 1",
  "Serie A",
  "Eredivisie",
  "Primeira Liga",
];

export async function GET(request: Request) {
  const apiKey = process.env.NEWS_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const clubsParam = searchParams.get("clubs");
  const clubNames = clubsParam
    ? clubsParam
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const queries = clubNames.length > 0 ? clubNames : LEAGUE_QUERIES;

  try {
    const requests = queries.map((query) =>
      fetch(
        `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent(
          query
        )}&language=en&category=sports&size=10`,
        { next: { revalidate: 10800 } }
      ).then((res) => (res.ok ? res.json() : { results: [] }))
    );

    const results = await Promise.all(requests);
    const allArticles = results.flatMap((result) => result.results ?? []);

    return NextResponse.json({ articles: allArticles });
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}