"use client";

import { useRouter } from "next/navigation";
import { clubs } from "../../data/clubs";

// First screen a brand-new visitor sees (also reachable any time at
// /onboarding). Previously this page WAS a full club-picker list, built
// separately from - and looking nothing like - the real "My Clubs" page at
// /clubs, which already does this job well (search, follow/unfollow, a
// "Following" section). Rather than keep two different club-picking UIs in
// sync, this is a short welcome screen with one button that sends people
// straight to that real page.
//
// Real, recognizable clubs, tiled as a full-page background pattern - a
// faint "ghost" texture behind everything, including straight through
// the middle where the text sits on top of it. Not meant to be read
// individually, just texture. Pulled from the app's real club list (every
// club we track, ~130 of them) instead of a small hand-picked set, so the
// pattern cycles through way more clubs before any of them repeats. This
// replaced an earlier version that hand-placed a couple dozen crests at
// fixed spots for different screen widths - it kept needing another round
// of fixes every time the window was a size that fell between two of
// those fixed breakpoints. A CSS grid tiles automatically at ANY size,
// phone or desktop, with no breakpoints to get wrong.
const CREST_URLS = clubs
  .map((club) => club.crest)
  .filter((crest): crest is string => Boolean(crest));

// Repeated enough times to fully tile a large desktop window - CSS grid
// plus overflow-hidden just clips whatever doesn't fit on a smaller
// screen, so the same list works at any size. With ~130 real clubs to
// draw from (instead of 18), each one only repeats every ~130 tiles
// instead of every 18.
const CREST_TILE = Array.from({ length: 420 }, (_, i) => ({
  key: i,
  crest: CREST_URLS[i % CREST_URLS.length],
}));

export default function OnboardingWelcome() {
  const router = useRouter();

  return (
    <main className="relative z-0 min-h-screen overflow-hidden text-white">
      {/* BACKGROUND - fixed so it always fills the whole screen, ignoring
          the extra bottom spacing the layout reserves for the nav bar */}
      <div className="fixed inset-0 -z-10 bg-[#080B13]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
          <div className="absolute bottom-[-120px] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[90px]" />
        </div>

        {/* CREST PATTERN - tiled across the entire screen as a faint
            "ghost" texture. It runs straight through the middle, behind
            the text below (that's deliberate) - grayscale plus very low
            opacity is what keeps the text readable on top of it. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid grayscale opacity-[0.09] grid-cols-[repeat(auto-fill,minmax(84px,1fr))] auto-rows-[84px]"
        >
          {CREST_TILE.map(({ key, crest }) => (
            <div key={key} className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative background texture, not worth next/image's overhead here */}
              <img src={crest} alt="" className="h-10 w-10 object-contain" />
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark, not worth next/image's overhead here */}
        <img
          src="/brand/clubside-mark.png"
          alt=""
          aria-hidden="true"
          width={96}
          height={96}
          className="mb-6 h-24 w-24 drop-shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
        />

        <h1 className="text-[32px] font-black leading-none tracking-[-0.03em]">
          Clubside
        </h1>
        <p className="mt-2 text-sm font-semibold text-white/45">
          Never miss what matters.
        </p>

        <p className="mt-6 max-w-xs text-[13px] leading-relaxed text-white/45">
          Follow your clubs to get their fixtures, results, and news, all in
          one place.
        </p>

        <button
          type="button"
          onClick={() => router.push("/clubs")}
          className="mt-8 rounded-2xl bg-white px-8 py-3.5 text-sm font-black text-[#111318] shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98]"
        >
          Choose your clubs →
        </button>
      </div>
    </main>
  );
}
