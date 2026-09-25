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

// This app only tracks men's clubs/competitions (see clubs.ts) - a women's
// football story about "Chelsea" or "Man Utd" still matches those same club
// names, so it slips past every other filter and shows up mislabelled as
// regular club news. Checked as whole words/phrases (not plain substrings)
// so it doesn't misfire on unrelated text that merely contains "women" as
// part of a longer word.
const WOMENS_FOOTBALL_MARKERS = [
  "women",
  "womens",
  "ladies",
  "wsl",
  "nwsl",
  "uwcl",
  "wfc",
  "w-league",
];

function looksLikeWomensFootballContent(text: string): boolean {
  const lower = text.toLowerCase();
  return WOMENS_FOOTBALL_MARKERS.some((marker) =>
    containsWholeWordOrPhrase(lower, marker)
  );
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

// Belt-and-braces on top of the blocked-source list above: some articles
// spell out an actual date inside the title/description itself (e.g. "Catch
// Everton - Aston Villa live on 15/01/2025"), and that date can be old even
// when the article's own pubDate metadata claims it's from today. Rather
// than only trust one known offending source, scan the text for an
// explicit day/month/year date and discard the article if that date is
// clearly in the past - this also protects against any other source doing
// the same thing later.
const EXPLICIT_DATE_PATTERN = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](20\d{2})\b/g;

function containsStaleExplicitDate(
  text: string,
  maxAgeMs: number,
  now: number
): boolean {
  EXPLICIT_DATE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EXPLICIT_DATE_PATTERN.exec(text)) !== null) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (day < 1 || day > 31 || month < 1 || month > 12) continue;
    const parsed = Date.UTC(year, month - 1, day);
    if (Number.isNaN(parsed)) continue;
    if (now - parsed > maxAgeMs) return true;
  }
  return false;
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

// Many WordPress-based sites append an English syndication footer -
// "The post <title> appeared first on <site>." - to every article they
// publish, in whatever language the article itself is actually written
// in. That footer alone is enough English text to fool a naive "does
// this contain any English word" check, which is how a French Bayern
// Munich article once slipped through: its only English words were from
// this exact footer. Stripping it out before checking the language (and
// before displaying the summary, since it's not part of the actual
// article and looks like clutter) closes that gap.
const SYNDICATION_BOILERPLATE_PATTERN =
  /\s*the post .*? appeared first on .*?\.?\s*$/i;

function stripSyndicationBoilerplate(text: string): string {
  return text.replace(SYNDICATION_BOILERPLATE_PATTERN, "").trim();
}

// NewsData.io's own language filter (the ?language=en request param, and
// each article's own `language` field checked above) isn't fully
// reliable - non-English articles occasionally slip through it. As a
// backstop, require the article to contain at least two different common
// English words, not just one - a single stray match (a club name, a
// player's name, a syndication footer) shouldn't be enough to call
// something "English" when the rest of the text isn't.
function isLikelyEnglish(text: string): boolean {
  const cleaned = stripSyndicationBoilerplate(text);
  const words = cleaned.toLowerCase().match(/[a-z']+/g) ?? [];
  const matches = new Set(words.filter((word) => ENGLISH_MARKER_WORDS.has(word)));
  return matches.size >= 2;
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

// Belt-and-braces final check right before anything reaches the screen: no
// matter which path built the list (AI relevance or the keyword fallback),
// make sure no two cards ever share the same id. This is what actually
// stops a duplicate from reaching the page even if some future change
// reintroduces one of these sources upstream.
function dedupeById(items: NewsUpdate[]): NewsUpdate[] {
  const seen = new Set<string>();
  const result: NewsUpdate[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
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
  // The AI is asked for exactly one result entry per article id, but it's
  // not perfectly reliable about that - it can occasionally repeat the same
  // id twice in its response. Without this guard, a repeated id would get
  // processed twice and the same story would show up as two identical
  // cards. Track which article ids (and which club within an article, in
  // case the AI also repeats a club name in one article's "clubs" list)
  // have already been turned into a card, and skip anything seen again.
  const seenResultIds = new Set<string>();

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

      const id = `${candidate.id}-${club.id}`;
      if (seenResultIds.has(id)) continue;
      seenResultIds.add(id);

      result.push({
        id,
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
  clubNames: string[],
  // Extra search terms (e.g. the leagues those clubs play in) fetched
  // alongside the club names, purely to widen the raw pool of articles
  // /api/news pulls in - each search term is its own request there,
  // capped at 10 results, so more terms means more candidate articles
  // to filter down from. Relevance below is still judged only against
  // the real `clubNames`, so a league-wide article still has to
  // actually be about a followed club to make it into the results -
  // this only ever adds more candidates, never loosens what counts as
  // relevant.
  extraQueries: string[] = []
): Promise<NewsUpdate[]> {
  const searchTerms = Array.from(new Set([...clubNames, ...extraQueries]));
  const query =
    searchTerms.length > 0
      ? `?clubs=${encodeURIComponent(searchTerms.join(","))}`
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

    const description = stripSyndicationBoilerplate(article.description ?? "");
    const text = `${article.title} ${description}`;
    if (!isLikelyEnglish(text)) continue;
    if (looksLikeNonFootballContent(text)) continue;
    if (looksLikeWomensFootballContent(text)) continue;
    if (containsStaleExplicitDate(text, MAX_AGE_MS, now)) continue;

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
        const built = dedupeById(buildFromRelevance(candidates, relevanceResults));
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

  const fallback = dedupeById(buildFromKeywordMatching(candidates));
  return fallback.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}