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
  category?: string;
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
];

// A plain substring check ("lower.includes(keyword)") matches inside other
// words too - e.g. the injury keyword "knock" was matching "knocked back an
// offer" in a transfer story, tagging it as an injury. Matching on whole
// words only (via \b word boundaries) avoids that class of false positive.
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWholeWordOrPhrase(text: string, keyword: string): boolean {
  const pattern = new RegExp(`\\b${escapeForRegExp(keyword)}\\b`);
  return pattern.test(text);
}

function guessCategory(text: string): UpdateCategory {
  const lower = text.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => containsWholeWordOrPhrase(lower, keyword))) {
      return category;
    }
  }
  return "Club";
}

const VALID_CATEGORIES = new Set<UpdateCategory>([
  "Club",
  "Injury",
  "Transfer",
  "Press",
  "Match",
]);

function isValidCategory(value: unknown): value is UpdateCategory {
  return typeof value === "string" && VALID_CATEGORIES.has(value as UpdateCategory);
}

// NewsData.io's "description" field isn't reliably short - some sources
// send back the full article body in it. Cap what we display so a card
// never balloons into a wall of text, cutting at the nearest word boundary
// rather than mid-word.
const MAX_SUMMARY_LENGTH = 260;

function truncateSummary(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_SUMMARY_LENGTH) return trimmed;
  const cut = trimmed.slice(0, MAX_SUMMARY_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  const safeCut = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${safeCut}…`;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Words too common to say anything about whether two headlines describe
// the same story - stripped out before comparing titles for overlap.
const TITLE_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "his",
  "her",
  "their",
  "its",
  "after",
  "before",
  "into",
  "over",
  "against",
  "vs",
  "new",
]);

function significantWords(normalizedTitle: string): Set<string> {
  return new Set(
    normalizedTitle
      .split(" ")
      .filter((word) => word.length > 2 && !TITLE_STOPWORDS.has(word))
  );
}

// How much of the smaller title's meaningful words also appear in the
// other title. Two outlets covering the same match will independently
// reuse the same player names, club names and score - even while wording
// the rest of the headline completely differently - so a high overlap is
// a strong signal they're the same story.
function titleSimilarity(a: string, b: string): number {
  const wordsA = significantWords(a);
  const wordsB = significantWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let shared = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) shared += 1;
  }

  const smaller = Math.min(wordsA.size, wordsB.size);
  return shared / smaller;
}

// Catches near-duplicate titles that aren't byte-identical: a source
// appending its own name to the same headline, and - more commonly - two
// different outlets independently paraphrasing the same story (different
// wording, same players/clubs/score). A high shared-word ratio between the
// two titles is treated as the same story either way.
function normalizedTitlesAreNearDuplicate(a: string, b: string): boolean {
  if (a === b) return true;
  return titleSimilarity(a, b) >= 0.6;
}

// A club name can collide with unrelated things (a wrestler's stage name,
// a place, a common first name). If the article clearly belongs to some
// other sport entirely, discard it outright - regardless of whether the
// AI relevance check is available that day.
const NON_FOOTBALL_MARKERS = [
  "wwe",
  "wrestl",
  "aew",
  " nxt",
  "ufc",
  " mma ",
  "boxing",
  "cricket",
  "rugby",
  "formula 1",
  " f1 ",
  " nba ",
  " nfl ",
  " nhl ",
  " mlb ",
  "tennis",
  "golf tour",
  "basketball",
  "baseball",
];

function looksLikeNonFootballContent(text: string): boolean {
  const lower = ` ${text.toLowerCase()} `;
  return NON_FOOTBALL_MARKERS.some((marker) => lower.includes(marker));
}

// Some sources republish old syndicated stories under a fresh current
// pubDate, which defeats the age filter below since it trusts that field.
// "Shotoe Nigeria" was confirmed doing this (articles about January 2025
// fixtures showing up labelled as today's news), so it's excluded outright
// rather than trusted to report its own dates honestly.
const BLOCKED_SOURCES = new Set<string>(["shotoenigeria"]);

function normalizeSourceKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isBlockedSource(article: RawArticle): boolean {
  const key = normalizeSourceKey(article.source_name ?? article.source_id ?? "");
  return key.length > 0 && BLOCKED_SOURCES.has(key);
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

    // Categorize using the same truncated text the user will actually
    // see, not the full raw article body - a long, unrelated tail further
    // down in the raw description shouldn't be able to hijack the category.
    const summary = truncateSummary(candidate.description);
    const category = guessCategory(`${candidate.title} ${summary}`);

    for (const clubId of clubIds) {
      result.push({
        id: `${candidate.id}-${clubId}`,
        clubId,
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

    const rawSummary =
      item.summary && item.summary.trim().length > 0
        ? item.summary
        : candidate.description;
    const summary = truncateSummary(rawSummary);
    // The AI already reads the full article to check relevance, so it can
    // hand back the category in the same response at no extra cost. Only
    // fall back to keyword-guessing if it didn't (older cached result, or
    // it returned something we don't recognize).
    const category = isValidCategory(item.category)
      ? item.category
      : guessCategory(`${candidate.title} ${summary}`);

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
  const seenNormalizedTitles: string[] = [];
  const candidates: Candidate[] = [];

  for (const article of rawArticles) {
    if (!article.title || !article.link) continue;
    if (seenLinks.has(article.link)) continue;
    if (isBlockedSource(article)) continue;

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
    if (looksLikeNonFootballContent(text)) continue;

    const normalizedTitle = normalizeTitle(article.title);
    const isDuplicateTitle = seenNormalizedTitles.some((seen) =>
      normalizedTitlesAreNearDuplicate(seen, normalizedTitle)
    );
    if (isDuplicateTitle) continue;

    seenLinks.add(article.link);
    seenNormalizedTitles.push(normalizedTitle);

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