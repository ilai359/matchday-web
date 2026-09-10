import { NextResponse } from "next/server";
import { getOrSet } from "@/lib/cache";

type ArticleInput = { id: string; title: string; description: string };

// Cache key covers exactly the inputs that determine the AI's output: the
// set of followed clubs and the set of candidate article ids. Different
// visitors following the same (or overlapping) clubs will very often see
// the same batch of candidate articles within any given refresh window,
// so this lets them share one Claude call instead of each paying for
// their own from scratch. Sorted so that club/article order in the
// request doesn't create needless duplicate cache entries.
function buildCacheKey(clubNames: string[], articles: ArticleInput[]): string {
  const sortedClubs = [...clubNames].map((name) => name.toLowerCase()).sort();
  const sortedIds = [...articles.map((a) => a.id)].sort();
  return `news-relevance:${JSON.stringify({ clubs: sortedClubs, ids: sortedIds })}`;
}

async function callAnthropic(
  apiKey: string,
  clubNames: string[],
  articles: ArticleInput[]
) {
  const prompt = `You are helping a football news app decide which articles genuinely belong to which clubs, and to remove duplicate coverage of the same story.

Here is the list of clubs the user follows:
${clubNames.map((name) => `- ${name}`).join("\n")}

Here are the articles to review, as a JSON array:
${JSON.stringify(articles)}

Step 1 - Relevance: For each article, decide which of the followed clubs (if any) it is genuinely and substantially about. Do not include a club just because it is mentioned in passing (for example, as an opponent in a fixture, or as another team linked to a transfer target). Only include a club if the article's main subject is that club.

Step 2 - Duplicates: Some articles may be different sources reporting the exact same real-world story (the same transfer, the same match result, the same announcement), even if the title and wording are completely different. Group articles that cover the same story together. For each such group:
- Pick exactly ONE article as the representative - prefer whichever has the clearer, more complete title and description.
- For the representative's entry, set "isDuplicate" to false, and set "clubs" to the UNION of every followed club that is genuinely the subject of that story across ALL versions in the group (not just the representative's own wording).
- For every other article in that same group, set "isDuplicate" to true and "clubs" to an empty array (they will be discarded, so their exact values don't matter beyond that).
Articles that do not share their story with any other article in the list are not duplicates - set "isDuplicate" to false for them and follow Step 1 as normal.

Step 3 - Summary: For the representative of each story (and for any non-duplicate article), rewrite the title and description into one clean, natural paragraph, using ONLY facts present in the original text(s). Do not add any information, statistics, quotes, or details that are not in the original text.

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"results":[{"id":"<article id>","clubs":["<exact club name from the list above>"],"summary":"<rewritten paragraph>","isDuplicate":true|false}]}

Include one entry in "results" for every article given, matched by its "id".`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `[news-relevance] Anthropic API returned ${response.status}:`,
      errorBody
    );
    // Thrown (not returned) so getOrSet never caches a failed attempt -
    // the next request, even moments later, gets a fresh try instead of
    // being stuck replaying today's failure for the next 30 minutes.
    throw new Error(`Anthropic API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.content?.[0]?.text ?? "";

  try {
    return JSON.parse(textContent);
  } catch {
    const match = textContent.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        console.error(
          "[news-relevance] Could not parse AI response as JSON:",
          textContent.slice(0, 500)
        );
        return { results: [] };
      }
    }
    console.error(
      "[news-relevance] AI response had no JSON object at all:",
      textContent.slice(0, 500)
    );
    return { results: [] };
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const body = await request.json();
  const clubNames: string[] = body.clubNames ?? [];
  const articles: ArticleInput[] = body.articles ?? [];

  if (clubNames.length === 0 || articles.length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Cached for 3 hours - the same window the underlying news fetch
    // itself uses (see src/app/api/news/route.ts), so this cache and the
    // articles it's analyzing go stale together.
    const parsed = await getOrSet(
      buildCacheKey(clubNames, articles),
      3 * 60 * 60 * 1000,
      () => callAnthropic(apiKey, clubNames, articles)
    );
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[news-relevance] Unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong", details: String(error) },
      { status: 500 }
    );
  }
}
