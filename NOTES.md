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

## First-open ("onboarding") screen redesigned

**Status: done, 2026-09-16.** Ilai found the very first screen a new
visitor sees (`/onboarding`) plain and unstyled - a leftover from early
development that showed the full club list with no branding, in a
different visual style from the rest of the app.

Turned out the app already has a genuinely good "pick your clubs" page:
`/clubs` ("My Clubs", also reachable any time from the bottom tab bar) -
search, follow/unfollow, a "Following" section for clubs you already
follow. Rather than fix up the old onboarding list into a second version
of the same thing, replaced it with a short welcome screen (Matchday
name/tagline, one sentence on what the app does, one button) whose
button sends people straight to that real `/clubs` page. Less to
maintain, and whoever opens the app first is now dropped somewhere on
brand rather than a bare list.

**Follow-up, same day:** Ilai's screenshot showed a light-gray strip at
the very bottom of the screen, breaking the dark design - a real bug,
not a style nitpick. Every page reserves a bit of space at the bottom so
the fixed nav bar never covers content, and every other page's own
background happens to match that reserved strip's color so it's
invisible - this new page uses its own different dark color, so the
mismatch showed through. Fixed by having the background fill the whole
screen regardless of that reserved space, the same trick used for any
full-bleed background.

Also added Ilai's request for club logos: eight real, recognizable
clubs' crests (Arsenal, Real Madrid, Barcelona, Liverpool, Man City,
PSG, Bayern Munich, Juventus) sit faded in the background as ambient
decoration - a small one in each corner that's safe on any phone width,
plus four more along the sides that only appear once the screen is wide
enough not to crowd the middle.

**Second follow-up, same day: the previous fix broke the page entirely
(a real regression, not a nitpick).** The dark background disappeared
completely - the whole screen showed the page's normal light-gray
background instead, making the white text on it nearly invisible.
Cause: the trick used to make the background ignore the reserved nav
space (an "always fill the whole screen" positioning technique) needs
the screen's main container to form its own self-contained layer -
without that one extra setting, the background ended up being drawn
behind the ENTIRE page instead of just behind this one screen's own
content. One-line fix. Re-verified clean, no new lint/type errors.

**Third follow-up, same day:** once it was rendering correctly, Ilai
felt it looked a bit sparse on a wide desktop window - fair, since the
first version only had 8 crests total and left big empty gaps top,
middle and bottom. Reworked into three tiers instead of two: the same
small always-visible corner set; a slightly bigger set in the safe
bands above/below the text (unchanged breakpoint); and a new, bigger
set (Man United, Chelsea, Dortmund, Atlético Madrid, Napoli, Porto)
that only shows up on a properly wide screen (roughly tablet-landscape
or a desktop window), since that's the only place there's enough room
beside the centered text without crowding it. 14 real clubs total on a
wide screen, still just 4 on a phone.

**Fourth follow-up, same day:** Ilai noticed all the crests sat in two
"walls" far left and far right, leaving a big empty gap either side of
the text in the middle. Added a fourth, innermost ring (AC Milan, Inter
Milan, Ajax, Tottenham) that sits closer in, between that empty gap and
the text - it only appears on a VERY wide window (bigger than the
existing rings need), since that's the point where there's actually
room for something that close to the text without touching it.

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

## App renamed Matchday -> Clubside, real logo/icon added, onboarding crests spread across full page

**Status: done, 2026-09-16 (committed locally as a7d68e5, not yet pushed - see the
push note right below this).**

Looked into the name "Matchday" for App Store discoverability - it's heavily
used already (official England Football app with 2,100+ ratings, plus several
other "Matchday..." apps, including one that does almost the same thing as
this app). Renamed every user-facing spot to **Clubside** (browser tab title,
onboarding welcome screen, Settings, My Clubs page). Left everything internal
untouched, per Ilai's call: repo name/folder (`matchday-web`), localStorage
keys, code comments - only what a user actually sees changed.

Ilai designed the real logo/icon himself (a shield/crest with a crowd + pitch
scene, green). That's now wired in for real: `src/app/favicon.ico`,
`icon.png`, and `apple-icon.png` (cleaned up from his source export - trimmed
a stray border, made the corners transparent for the web versions, and made
a flat full-bleed version with no baked-in rounding for Apple's icon). A
1024x1024 master flat version is saved at
`public/brand/clubside-icon-master-1024.png`, ready for whenever the real
native App Store icon is needed - not wired into the web app itself.

**Left open, Ilai's call:** the onboarding screen's big gradient "C" badge is
still blue (from an earlier Claude-drawn placeholder), not the real green
icon - swapping it means either mixing green into an otherwise all-blue app
theme, or shifting the app's whole accent color toward green. Flagged, not
done.

Also redesigned the onboarding screen's decorative background crests (the
faded club badges) to spread across the *whole* page - top edge, bottom
edge, both side rails, and a close-in ring - instead of two side columns
with a lot of dead space top/center/bottom. Reused the same 18 real club
crests already in the file (didn't add unverified new football-data.org
crest IDs, to avoid any risk of a broken-image icon). Same responsive
behaviour as before - phones still only get the 4 safe corner crests.

Domain: looked into buying one (e.g. clubside.com via Cloudflare Registrar
or Porkbun, ~$10-11/year) but confirmed Apple does NOT require a custom
domain for App Store submission - a support URL and privacy policy URL on
the existing free Vercel address work fine. So no domain bought yet;
revisit only if/when it actually matters for marketing.

## Technical snag: `git push` doesn't work from this environment's remote shell

New wrinkle on top of the existing `.git/index.lock` quirk noted above:
attempting `git push origin main` from this session's remote-device shell
fails outright with `403 from proxy` trying to reach github.com - that
shell's internet access is restricted and can't reach GitHub at all, not a
one-off glitch. Committing locally works fine (after clearing any stale
lock file, same as before); the actual `git push` step needs to be run by
Ilai himself, from his own Terminal/VS Code on his Mac (which has normal
internet access) - same as he mentioned already doing previously. So the
end-of-day flow is: Claude stages + commits everything locally, then Ilai
runs the actual `git push` (or clicks "Sync/Push" in VS Code's Source
Control panel) to actually make it go live on GitHub/Vercel.

## Onboarding follow-ups: real icon badge, phone crests fixed, then background redesigned entirely

**Status: done, 2026-09-16 (committed locally as 733a04f, b2f8956, c4893f3, eafe989 -
not yet pushed, same push note as above applies).**

Several rounds of fixes to the onboarding welcome screen after the previous
entry above, based on Ilai actually looking at it on his phone and at
different desktop window sizes:

- Swapped the leftover blue gradient "C" placeholder badge for Ilai's real
  icon (`/brand/clubside-mark.png`) - this had been flagged as "left open"
  in the note above but should have been done at the same time as the rest
  of the page; my mistake for not doing it then.
- The spread-out crests from before were only visible above a certain
  screen width (Tailwind's `sm`/`lg`/`xl` breakpoints) - on an actual phone
  only 4 crests (the corner ones) were showing, bunched in the corners
  instead of spread out. Patched once (added a phone-specific crest tier),
  then found a second gap - a range of desktop widths between two
  breakpoints where a whole tier vanished, leaving empty space in the
  middle of the page.
- Rather than keep patching individual breakpoints, replaced the whole
  approach: the background is now a single CSS grid that auto-tiles crest
  logos across the *entire* page at any screen size (phone or desktop, no
  breakpoints at all), at very low opacity/grayscale as a "ghost" texture,
  with the page's real text sitting on top of it - including directly over
  crests in the middle, which is intentional this time rather than an area
  the crests were avoiding. Verified the tiling actually covers the full
  screen with no gaps, at both a phone size and a wide desktop size,
  before shipping it.
- That tiling first used the same small hardcoded list of 18 clubs, which
  meant each one repeated about 23 times across the page. Changed it to
  pull crest images from the app's real, full club list in
  `src/data/clubs.ts` (~130 clubs) instead, so each club now only repeats
  roughly every 130 tiles instead of every 18 - much more variety.

## iOS search bar zoom, Settings page rebuild, and news update investigation

**Status: iOS fix and Settings rebuild done and committed (f83d021, 1acf686,
f185b2c, b50ebfa, 1422c65). Caching fix (below) done and committed, not yet
pushed - same push note as always applies.**

- Fixed the clubs search box auto-zooming the whole page when tapped on an
  iPhone. Cause: iOS Safari zooms in on any text input with a font size
  under 16px, and the search box was using a 14px size. Fixed by bumping
  it to 16px on phones only, keeping the smaller size on desktop.
- Settings page was empty/placeholder before. Rebuilt it with actual
  working content, through a few rounds of Ilai's feedback: first added
  "Your Clubs" (with real crest badges + which leagues they cover),
  "Appearance" (existing light/dark toggle), "Data" (an "unfollow all
  clubs" reset, with a confirm step), and "About". Tried adding a
  "Coverage" stats section (clubs/leagues/countries tracked) and a "Send
  Feedback" email button, but Ilai correctly called both out as not
  interesting/not useful (the feedback button would have shipped with no
  actual email address behind it, which would have been confusing) - both
  were removed. Final Settings page: Your Clubs, Appearance, Data, About.

### Investigated: "almost no updates" and articles always showing as "yesterday"

Ilai asked why real news articles (not the AI-written ones) are almost
always dated the day before, and why updates feel sparse. Two separate
findings, both confirmed rather than guessed at:

1. **"Always yesterday" - NewsData.io's own limitation, not a bug.** Our
   news source (NewsData.io, free plan) delays newly-published articles by
   12 hours before they're available through their API - confirmed
   directly in their own dashboard. Combined with our 3-hour cache, this
   means freshly-published articles realistically won't show up as "today"
   until well into the same day at the earliest, and often read as
   "yesterday." Not fixable without upgrading NewsData.io's plan (a real
   cost - not something to do without discussing first).
2. **"Almost no updates" - likely caused by a real caching bug, now
   fixed (see below).** Checked NewsData.io's own usage dashboard first
   to rule out running out of API credits: only 33 of 200 monthly credits
   used, so that's not the cause. The remaining likely explanation: the
   AI relevance-matching step (which double-checks that a fetched article
   is actually about a club you follow) was using a cache that only lives
   in a single server's memory. Vercel (where the app is hosted) runs
   many short-lived server copies behind the scenes, so most requests
   never saw the shared cache and the AI step may have been silently
   failing or being skipped more than intended.

**Fix applied:** Replaced the in-memory cache (`src/lib/cache.ts`) with
Upstash Redis - a small free shared-storage service every server copy can
actually read from. If the Upstash connection details aren't set up yet,
the code automatically falls back to the old in-memory behavior, so
nothing breaks in the meantime.

**Still needed from Ilai to actually turn this on:**
1. Sign up for a free Upstash account (upstash.com) - no credit card
   needed for the free tier.
2. Create a Redis database there (a couple of clicks).
3. Copy its "REST URL" and "REST TOKEN" values.
4. Add them as environment variables named `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` - both in Vercel's project settings (so the
   live site picks them up) and in the local `.env.local` file (so it
   works when testing locally too).
5. Run `npm install @upstash/redis` once in Terminal, in the project
   folder, to actually install the new package (Claude can't run installs
   from this environment - no internet access on that side).
6. Push the code as usual once ready.

### Credit usage, explained for reference

Ilai also asked what actually drives NewsData.io credit usage, in case
user growth becomes a problem. Answer: a credit is spent per distinct club
name queried, not per user and not per app visit - because the fetched
articles for a given club are cached and shared across every user
following that club for a few hours. So the real thing to watch, if the
app grows, is the total number of *different* clubs being actively
followed/checked across all users at once (out of the ~130 tracked), not
raw user count or how often people open the app. At current usage (33/200
credits over about 4 weeks) this is nowhere close to a real constraint.


### Upstash Redis caching - finished and turned on

The Upstash setup described above is done: Ilai created the free Upstash
account and database, added UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN
to both Vercel and .env.local, and ran `npm install @upstash/redis`. The
shared-cache fix is fully wired up now, pending a push to actually go live.

### Fixed: npm security warnings

`npm audit` flagged 3 vulnerabilities (2 high, 1 critical) after
installing @upstash/redis - one of them a real Next.js security issue,
not a false alarm. Fixed with `npm audit fix` and `npm audit fix --force`,
which bumped Next.js from 16.3.0 to 16.3.5. Confirmed 0 vulnerabilities
remain.

### Fixed: a French article slipping past the "English only" filter

Root cause: WordPress-based news sites append an English sentence
("The post [title] appeared first on [site].") to the end of every
article regardless of what language the article itself is written in.
Our language filter only checked for any English word appearing anywhere
in the text, so that boilerplate sentence alone was enough to fool it on
an otherwise all-French article. Fixed by stripping that boilerplate
before checking, and requiring 2 distinct English marker words to match
(not just 1) - verified against the actual French Bayern Munich article
that was reported.

### Added: real Club Stats to Settings

Settings now shows genuine stats about your followed clubs - average
league position, combined points, and your best-placed club - pulled
from the same live standings data used elsewhere in the app, not filler
numbers.

### Redesigned: Match Details on the match page (two attempts)

First attempt turned the flat gray rows into icon-badged rows in one
card - rejected as "still boring, just rows with icons now." Rebuilt from
scratch as a "ticket stub" layout instead: a team-color gradient stripe,
a calendar-page date tile, a competition pill, and a dashed tear-line
with cut-out notches above the venue - genuinely different shapes instead
of another stacked list.

### Fixed: Form/Head-to-head not showing up until repeated refreshes

Root cause, confirmed by reading the code rather than guessing: opening
a match page fires up to 5 simultaneous requests to football-data.org,
which only allows 10 requests/minute on the free plan - so several of
those requests were getting rate-limited (HTTP 429) with no retry logic
anywhere except the news pipeline. Fixed by adding a shared
fetchWithRetry helper (retries only on 429/rate-limited or 5xx/server-
error responses, a few times with a short delay) and using it in every
football-data.org-backed API route.

### Added: live match stats (possession, shots, corners, cards)

Match pages for finished or live matches now show real stats - not just
the score - sourced from API-Football: possession, shots, shots on
target, corners, passes, fouls, and cards, shown as proportional home-
vs-away bars. This extends API-Football (previously only used for
Europa/Conference League, which football-data.org doesn't cover at all)
to also resolve stats for the 7 regular domestic leagues, by matching a
football-data.org match to its API-Football counterpart via team names
and kickoff date.

Kept well inside the free 100-requests/day API-Football limit: a
finished match's stats are cached for 30 days (they never change again),
a live match's for 60 seconds, and league-lookup results for a week - so
the same match's stats are fetched from API-Football at most once, ever,
no matter how many people look at it.

Not done yet (discussed with Ilai, chose this first): per-player stats on
a club's own page (e.g. minutes played, ratings) alongside the existing
Top Scorers/Top Assists - that's the next thing to build.
