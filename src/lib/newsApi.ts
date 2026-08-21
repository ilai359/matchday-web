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

function findMatchingClubIds(text: string): string[] {
  const lower = text.toLowerCase();
  return clubs
    .filter((club) => lower.includes(club.name.toLowerCase()))
    .map((club) => club.id);
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

export async function fetchLiveUpdates(): Promise<NewsUpdate[]> {
  const response = await fetch("/api/news");
  if (!response.ok) {
    throw new Error("Failed to fetch news");
  }
  const data = await response.json();
  const rawArticles: RawArticle[] = data.articles ?? [];

  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const result: NewsUpdate[] = [];

  for (const article of rawArticles) {
    if (!article.title || !article.link) continue;
    if (seenLinks.has(article.link)) continue;

    if (
      article.language &&
      !article.language.toLowerCase().startsWith("en")
    ) {
      continue;
    }

    const text = `${article.title} ${article.description ?? ""}`;
    if (!isLikelyEnglish(text)) continue;

    const normalizedTitle = normalizeTitle(article.title);
    if (seenTitles.has(normalizedTitle)) continue;

    const clubIds = findMatchingClubIds(text);
    if (clubIds.length === 0) continue;

    seenLinks.add(article.link);
    seenTitles.add(normalizedTitle);
    const category = guessCategory(text);
    const publishedAt = article.pubDate
      ? `${article.pubDate.replace(" ", "T")}Z`
      : new Date().toISOString();
    const source = article.source_name ?? article.source_id ?? "News";

    for (const clubId of clubIds) {
      result.push({
        id: `${article.article_id ?? article.link}-${clubId}`,
        clubId,
        category,
        title: article.title,
        summary: article.description ?? "",
        source,
        publishedAt,
        link: article.link,
      });
    }
  }

  return result.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}