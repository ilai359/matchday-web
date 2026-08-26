import { clubs } from "../data/clubs";
import { UpdateCategory } from "../data/updates";

export type NewsUpdate = {
  id: string;
  clubId: string;
  category: UpdateCategory;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  link: string;
};

type RawArticle = {
  article_id?: string;
  title?: string;
  description?: string | null;
  link?: string;
  pubDate?: string;
  source_id?: string;
  source_name?: string;
  language?: string;
};

type RelevanceResult = {
  id: string;
  clubs: string[];
  summary: string;
  isDuplicate?: boolean;
};

type Candidate = {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  link: string;
};

const CATEGORY_KEYWORDS: { category: UpdateCategory; keywords: string[] }[] = [
  {
    category: "Injury",
    keywords: [
      "injury",
      "injured",
      "knock",
      "sidelined",
      "surgery",
      "scan",
      "hamstring",
      "groin",
      "acl",
      "ruled out",
      "fitness test",
    ],
  },
  {
    category: "Transfer",
    keywords: [
      "transfer",
      "signing",
      "signs for",
      "loan move",
      "medical ahead",
      "agree terms",
      "million deal",
      "move to",
      "unveiled",
    ],
  },
  {
    category: "Press",
    keywords: [
      "press conference",
      "speaks",
      "manager said",
      "boss said",
      "interview",
      "previews",
      "reacts",
    ],
  },
  {
    category: "Fixture",
    keywords: [
      "kick-off",
      "kickoff",
      "postponed",
      "rescheduled",
      "fixture",
      "schedule",
      "confirmed for",
      "date confirmed",
    ],
  },
  {
    category: "Match",
    keywords: [
      "beat",
      "beats",
      "defeat",
      "victory",
      "draw with",
      "full-time",
      "half-time",
      "match report",
      "score",
      "goals",
      "win over",
      "wins",
      "loses to",
    ],
  },
];

function guessCategory(text: string): UpdateCategory {
  const lower = text.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }
  return "Club";
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ENGLISH_MARKER_WORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "this",
  "that",
  "were",
  "their",
  "there",
  "which",
  "could",
  "would",
  "should",
  "about",
  "into",
  "after",
  "before",
  "during",
  "under",
  "against",
  "have",
  "been",
  "will",
]);

function isLikelyEnglish(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  return words.some((word) => ENGLISH_MARKER_WORDS.has(word));
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function findMatchingClubIdsByKeyword(
  title: string,
  description: string
): string[] {
  const titleLower = title.toLowerCase();
  const titleMatches = clubs
    .filter((club) => titleLower.includes(club.name.toLowerCase()))
    .map((club) => club.id);

  if (titleMatches.length > 0) {
    return titleMatches;
  }

  const fullLower = `${title} ${description}`.toLowerCase();
  const counts = clubs
    .map((club) => ({
      id: club.id,
      count: countOccurrences(fullLower, club.name.toLowerCase()),
    }))
    .filter((entry) => entry.count > 0);

  if (counts.length === 0) return [];

  const maxCount = Math.max(...counts.map((entry) => entry.count));
  return counts
    .filter((entry) => entry.count === maxCount)
    .map((entry) => entry.id);
}

function buildFromKeywordMatching(candidates: Candidate[]): NewsUpdate[] {
  const result: NewsUpdate[] = [];
  for (const candidate of candidates) {
    const clubIds = findMatchingClubIdsByKeyword(
      candidate.title,
      candidate.description
    );
    if (clubIds.length === 0) continue;

    const category = guessCategory(`${candidate.title} ${candidate.description}`);

    for (const clubId of clubIds) {
      result.push({
        id: `${candidate.id}-${clubId}`,
        clubId,
        category,
        title: candidate.title,
        summary: candidate.description,
        source: candidate.source,
        publishedAt: candidate.publishedAt,
        link: candidate.link,
      });
    }
  }
  return result;
}

function buildFromRelevance(
  candidates: Candidate[],
  relevanceResults: RelevanceResult[]
): NewsUpdate[] {
  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.id, candidate])
  );
  const result: NewsUpdate[] = [];

  for (const item of relevanceResults) {
    if (item.isDuplicate) continue;

    const candidate = candidatesById.get(item.id);
    if (!candidate) continue;
    if (!item.clubs || item.clubs.length === 0) continue;

    const summary =
      item.summary && item.summary.trim().length > 0
        ? item.summary
        : candidate.description;
    const category = guessCategory(`${candidate.title} ${summary}`);

    for (const clubName of item.clubs) {
      const club = clubs.find(
        (c) => c.name.toLowerCase() === clubName.toLowerCase()
      );
      if (!club) continue;

      result.push({
        id: `${candidate.id}-${club.id}`,
        clubId: club.id,
        category,
        title: candidate.title,
        summary,
        source: candidate.source,
        publishedAt: candidate.publishedAt,
        link: candidate.link,
      });
    }
  }

  return result;
}

export async function fetchLiveUpdates(
  clubNames: string[]
): Promise<NewsUpdate[]> {
  const query =
    clubNames.length > 0
      ? `?clubs=${encodeURIComponent(clubNames.join(","))}`
      : "";
  const response = await fetch(`/api/news${query}`);
  if (!response.ok) {
    throw new Error("Failed to fetch news");
  }
  const data = await response.json();
  const rawArticles: RawArticle[] = data.articles ?? [];

  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const candidates: Candidate[] = [];

  for (const article of rawArticles) {
    if (!article.title || !article.link) continue;
    if (seenLinks.has(article.link)) continue;

    if (
      article.language &&
      !article.language.toLowerCase().startsWith("en")
    ) {
      continue;
    }

    if (!article.pubDate) continue;
    const publishedAt = `${article.pubDate.replace(" ", "T")}Z`;
    const publishedTime = new Date(publishedAt).getTime();
    if (Number.isNaN(publishedTime)) continue;
    if (now - publishedTime > MAX_AGE_MS) continue;

    const description = article.description ?? "";
    const text = `${article.title} ${description}`;
    if (!isLikelyEnglish(text)) continue;

    const normalizedTitle = normalizeTitle(article.title);
    if (seenTitles.has(normalizedTitle)) continue;

    seenLinks.add(article.link);
    seenTitles.add(normalizedTitle);

    candidates.push({
      id: article.article_id ?? article.link,
      title: article.title,
      description,
      source: article.source_name ?? article.source_id ?? "News",
      publishedAt,
      link: article.link,
    });
  }

  if (candidates.length === 0 || clubNames.length === 0) {
    return [];
  }

  try {
    const relevanceResponse = await fetch("/api/news-relevance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clubNames,
        articles: candidates.map((candidate) => ({
          id: candidate.id,
          title: candidate.title,
          description: candidate.description,
        })),
      }),
    });

    if (relevanceResponse.ok) {
      const relevanceData = await relevanceResponse.json();
      const relevanceResults: RelevanceResult[] = relevanceData.results ?? [];
      if (relevanceResults.length > 0) {
        const built = buildFromRelevance(candidates, relevanceResults);
        return built.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        );
      }
    }
  } catch {
    // AI check unavailable — fall through to keyword matching below.
  }

  const fallback = buildFromKeywordMatching(candidates);
  return fallback.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}