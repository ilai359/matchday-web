# Matchday-web - working notes / backlog

Plain-language notes so future work doesn't lose track of decisions made in
chat. Keep this updated as things are decided or finished.

## AI-written club spotlight articles for low-coverage clubs

**Status: this already existed in the app (`src/data/clubSpotlights.ts` +
wired into the Updates page) - it just went stale, since nothing was
regenerating it. Refreshed once by hand on 2026-09-15; still needs a real
plan for keeping it updated automatically (see "Still open" below).**

Correction to an earlier version of this note: the "around 30 clubs" isn't
a hand-picked cross-league list of small clubs - it's simply every club in
two entire leagues that get little English-language news coverage even for
their bigger sides:

- Every Primeira Liga (Portugal) club EXCEPT Porto, Benfica and Sporting CP
- Every Eredivisie (Netherlands) club EXCEPT Ajax, PSV Eindhoven and
  Feyenoord

(Braga and AZ Alkmaar ARE included, even though they're their leagues'
4th-biggest club, because they still get much less coverage than the
traditional big 3 in each country.)

How it already works (`src/app/updates/page.tsx`): each spotlight is only
shown to a user if they actually follow that club, and it's always labeled
"AI Summary · written [date]" in the UI - never presented as if it came
from a real news outlet. Category is hardcoded to "Club".

**Content rule (important, keep this whenever it's regenerated):** every
spotlight must be grounded in real, checkable facts only - current league
position/points, the actual last result, the actual next fixture. No
invented quotes, no invented player stats, no invented manager names/drama.
The previous batch (written 2026-09-09/10) *did* include specific player
stats and manager names, and I couldn't re-verify all of those confidently
during the 2026-09-15 refresh, so I deliberately left that kind of detail
out this time and kept it to standings/results/fixtures only. Better to be
a bit plainer than to risk stating something false about a real person.

**Still open - not solved yet:** there's no automatic refresh. The
2026-09-15 update was me manually researching current standings/results
via web search and hand-writing the 29 entries into the file. That does
not scale as a recurring "every few days" process - next time this needs
updating, either repeat this manual process, or (better, but not yet
designed) build a real pipeline that pulls the club's recent
results/fixtures/table position from the app's own football-data.org
integration and has Claude turn that into a short write-up automatically.
That's a real feature to design (cost, hosting the automation/schedule,
etc.), not a quick fix.

One dead entry was removed during the refresh: the old file had a
"telstar" spotlight, but there's no club with id "telstar" in
`src/data/clubs.ts` at all, so it could never actually display to anyone.
Dropped rather than guessing what it was supposed to be - flag if that
was meant to be a real tracked club that's missing from `clubs.ts`.

The 29 clubs currently covered:

Portugal: Académico de Viseu, Alverca, Arouca, Braga, Casa Pia, CD
Nacional, Estoril Praia, Estrela da Amadora, Famalicão, Gil Vicente,
Marítimo, Moreirense, Rio Ave, Santa Clara, Vitória SC

Netherlands: ADO Den Haag, AZ Alkmaar, Excelsior, FC Groningen, FC Twente,
FC Utrecht, Fortuna Sittard, Go Ahead Eagles, NEC Nijmegen, PEC Zwolle, SC
Cambuur, SC Heerenveen, Sparta Rotterdam, Willem II

## Stadium name / city on match cards and match detail page

**Status: done, 2026-09-15.** Added `src/data/stadiums.ts` (real stadium
name + city for all 132 tracked clubs, hand-researched). The football-data
API often leaves its own "venue" field blank for matches that haven't
kicked off yet, so `footballApi.ts` now falls back to the home club's own
stadium from that file whenever the API doesn't provide one. Shows up on:
home page "Coming up" card, home page "Up next" list, Matches page, and
the match detail page's "Match Details" section.

## Matches page: club filter resetting to "All clubs"

**Status: done, 2026-09-15.** Filtering by a club, opening a match, then
going back was resetting the filter to "All clubs". Fixed the same way the
scroll-position was already fixed on that page: remember the selected
filter in the browser's per-tab storage (`sessionStorage`) so it survives
navigating away and back.

## Champions League "form" showing blank for clubs we don't track

**Status: done, 2026-09-15 (took two passes to fully fix).** On a match
page for e.g. Barcelona vs. Galatasaray, Barcelona's "recent form" (the
row of W/D/L circles) showed correctly, but Galatasaray's always said "No
matches played in this competition yet" - even though Galatasaray had, in
fact, already played (confirmed for real via UEFA's own site: Galatasaray
played Sporting CP on Sept 9).

Root cause: a genuine bug, not a missing feature, but it took two fixes
to actually solve, because the same underlying problem existed in two
separate places:

1. When the app sees a team it doesn't recognize (outside the 132 tracked
   clubs), the right behavior is to fall back to using that team's own
   name as a stand-in ID, so it can still be matched against elsewhere.
   The code that fetches *past match results* was missing that fallback
   entirely (fixed in `src/lib/footballApi.ts`).
2. Even after fixing #1, form still didn't show - because a second,
   separate spot (`buildFromLive` in `MatchDetailClient.tsx`, which builds
   the "currently viewing this match" data) was throwing that same
   stand-in ID away before it ever got used, for any team we don't track.
   Fixed by keeping it there too.

Missed #2 on the first pass and shipped it as "done" before actually
retesting - lesson noted. Both are now fixed together. No new club data
was added - Galatasaray still isn't a "tracked club" (no club page, can't
be followed, etc.), this only fixes its form/head-to-head numbers showing
correctly when it comes up as an opponent. Verified clean with no new
lint/type errors both times.

## Small pre-existing code-quality issues

**Status: the 4 originally-found ones are fixed (2026-09-15).** These never
affected what the live site does - purely style nitpicks a linter (an
automatic code-style checker) flagged while other files were being edited:

- `MatchDetailClient.tsx`: a "set loading state" call the linter wanted
  moved/avoided - fixed by computing that flag at display time instead of
  storing it, for the one branch where that was easy and free; the other
  one (the normal "start loading, then resolve" pattern used everywhere
  for data fetching) is intentionally kept as-is with a one-line note
  explaining why, since "fixing" it would mean writing worse code to
  satisfy an overly strict rule for zero real benefit.
- `MatchDetailClient.tsx`: a date/time calculation the linter called
  "impure" - it's inside a useEffect, which is exactly where that's
  supposed to happen; kept as-is with a one-line note explaining why.
- `MatchDetailClient.tsx`: a variable declared with `let` that was never
  actually reassigned - changed to `const`.
- `footballApi.ts`: a function used the generic type `any` instead of a
  specific type - given it a proper type.

Verified with no new type or lint errors after each change.

**Found two more of the same style, elsewhere, not fixed yet:** while
double-checking the whole project's linter output (not just the files
touched today), two more pre-existing "set state directly in an effect"
nitpicks turned up in files untouched this session -
`src/components/YourClubs.tsx` and `src/context/ClubsContext.tsx`. Same
deal: cosmetic, not bugs, not touched today since they're outside what was
asked - flagging here so they're not lost, fix whenever wanted.

## Venue (stadium name) for Champions League opponents we don't track

**Status: done, 2026-09-15.** Same theme as the "form" fix above: a match
page for e.g. Sabah FK vs. Barcelona showed no venue at all, because that
only worked for our 132 tracked clubs (`src/data/stadiums.ts`) or whenever
football-data.org happened to include it on the match itself - neither
covered an opponent we don't track.

Added a last-resort lookup for exactly that case: `src/app/api/team-info`
asks football-data.org directly for that specific club's real stadium
name (cached for 30 days per club, since a stadium basically never
changes - no reason to keep spending API calls re-asking for the same
one). It's only ever called when nothing else already provided a venue,
so this never runs for the 132 tracked clubs or for matches that already
came with venue data from the match itself. Wired up in three places:
the match detail page, the home page ("Coming up" card and "Up next"
list), and the Matches page.

**City was tried and deliberately dropped.** football-data.org doesn't
give a clean "city" field for a club we don't track, only a free-text
address, and guessing turned out unreliable enough that Ilai asked to
show nothing rather than risk a wrong city - so `/api/team-info` only
returns the venue now. City still shows normally for the 132 tracked
clubs (from the hand-checked `stadiums.ts`), just not for an untracked
opponent. If a specific untracked club's stadium ever needs a city too,
the fix is a one-line addition to `stadiums.ts` for that club, same as
any of our other 132.

## New: club detail page

**Status: done, 2026-09-15.** The "Your Clubs" cards on the home page
(league table + top scorers/assists per club you follow) are now a link -
tap the colored header of a card and it opens a full page for that club at
`/clubs/<club-id>` (new: `src/app/clubs/[id]/`).

Also compacted the league table rows on the home page cards themselves -
they were taking up more vertical space than felt necessary, especially
when only a handful of rows show.

What's on the new club page (my call on scope, easy to add to or trim):

- Header with crest, league, position, and a Follow/Unfollow button
- Full season record - P/W/D/L/Pts (the home page card only had room for
  P/W/D/Pts)
- The AI club spotlight blurb, if this club has one (one of the ~30
  low-coverage clubs from the earlier feature above)
- Recent form (last 5 results as W/D/L pills) plus a list of those results
  you can tap into for the full match page
- Upcoming fixtures, same tap-through
- The full league table (not just a window around this club - there's
  room for it here), collapsed to the top 8 by default with a "Show full
  table" toggle
- This club's own top 5 scorers and top 5 assists (the home page card
  showed the *league's* top scorers, not necessarily this club's own
  players - this page filters to just this club)
- This club's most recent news/updates, with a link through to the full
  Updates page

Deliberately left out for now: head-to-head history against a specific
opponent (that's really a match-vs-match thing, already on the match
detail page) and any kind of squad list (we don't have full roster data
wired up anywhere in the app yet - would need a new data source).

**Follow-up fixes, 2026-09-15 (from Ilai's screenshots of the new page):**

- The "vs"/"@" labels on the recent-results and upcoming-fixtures lists
  now say "H" (home) or "A" (away) instead - "@" was meant to mean "away
  game" but wasn't clear at a glance.
- Fixed a real bug: the "Latest news" section could show the exact same
  story twice (two identical-looking cards for one article). Root cause -
  the AI step that reads each candidate article and decides which club(s)
  it's about and whether it's a duplicate of another article in the batch
  is asked to return exactly one result per article, but it isn't
  perfectly reliable about that and can occasionally repeat itself. When
  it did, the same article got turned into a news card twice. Fixed with
  two layers: (1) skip a repeated result instead of processing it again,
  and (2) as a backstop, never let two cards with the same identity reach
  the screen no matter which code path built the list. This pipeline is
  shared by every page that shows news (this club page, the home page,
  and the Updates page), so the fix protects all of them, not just the
  club page where it was spotted.

**Where the club page's news comes from, since Ilai asked:** it's the
exact same underlying system as the main Updates page - same NewsData.io
news source, same AI step that decides relevance/category/duplicates -
just asked about only this one club instead of every followed club, so
yes, it's only this club's news.

**Second follow-up, same day: the news shown was genuinely wrong, not
just duplicated.** Ilai's next screenshot showed articles that had
nothing to do with Barcelona at all ("Valencia sack Corberan", a Serie A
story about Roma/Inter) sitting under Barcelona's "Latest news" - plus
still one repeat. Cause: asking the AI to judge relevance from a search
for just one club's name on its own gave it a thin, noisier pool of
candidate articles to choose from, and it was more likely to misjudge
something as relevant with less to compare against - unlike the Updates
page, which asks about every followed club at once and has always looked
right.

Fix (Ilai's suggestion, and the right one): stopped asking about just one
club. The club page now asks the same question the Updates page does -
about every club Ilai follows at once - and then simply keeps whichever
of those already-tagged articles belong to this specific club. Since
every article that comes back is already labeled with which club(s) it's
genuinely about (that's how the Updates page sorts articles under the
right club in the first place), this is just filtering existing results,
not a new/separate lookup. Bonus: because this now reuses the same
question the Updates page asks, visiting a club page right after (or
before) the Updates page reuses the same cached answer instead of asking
again - so this is a bit cheaper too, not more expensive.

**Third follow-up, same day:** once the news was showing correctly, Ilai
asked for the "H"/"A" labels to be visually distinct from the club name
next to them (plain text right next to a bold name made them blend
together). Now shown as a small colored chip - blue for "H", orange for
"A" - so home vs away is readable at a glance, not just from the letter.

## Technical snag: stale `.git/index.lock` file on this machine

Not a code bug - a quirk of how this session's remote-device tools mount
your project folder. Occasionally a `.git/index.lock` file gets left
behind (a normal, temporary file Git creates and is supposed to clean up
automatically) because this environment can't fully delete files the
normal way. When that happens, Git write commands (`git add`, `git
commit`) will refuse to run and say "Unable to create .git/index.lock:
File exists" until it's cleared. The fix: rename that file to something
else first (renaming works even though deleting doesn't), then the Git
command works normally. Worth knowing about in case the eventual
end-of-day push hits this - it looks scarier than it is and takes one
extra step to clear.
