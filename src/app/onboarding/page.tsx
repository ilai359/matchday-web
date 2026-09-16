"use client";

import { useRouter } from "next/navigation";

// First screen a brand-new visitor sees (also reachable any time at
// /onboarding). Previously this page WAS a full club-picker list, built
// separately from - and looking nothing like - the real "My Clubs" page at
// /clubs, which already does this job well (search, follow/unfollow, a
// "Following" section). Rather than keep two different club-picking UIs in
// sync, this is a short welcome screen with one button that sends people
// straight to that real page.
//
// The scattered crest chips are purely decorative - well-known clubs to
// hint at the range of teams Clubside covers. Spread across the FULL
// page (top edge, bottom edge, both side rails, plus a close-in ring),
// not just two side columns - each tier only appears once there's
// genuinely room for it without crowding the centered column:
// - CORNER_CRESTS: small, always visible - safe even on a narrow phone.
// - OUTER_BAND_CRESTS: a bit bigger, hug the very top/bottom edges at
//   the sides (sm breakpoint and up).
// - SPREAD_LG_CRESTS: the biggest - two more along the top edge, two
//   along the bottom edge (both nearer the horizontal center than the
//   outer band), plus a side-rail pair level with the centered text
//   (lg breakpoint and up) - this is what used to be two empty side
//   walls with dead space top/center/bottom; now the top and bottom
//   edges carry crests across their full width too.
// - SPREAD_XL_CRESTS: an extra side-rail pair plus a closer-in ring,
//   only once the window is properly wide (xl breakpoint) - any
//   narrower and these would start overlapping the text column.
const CORNER_CRESTS = [
  { id: "arsenal", crest: "https://crests.football-data.org/57.png", position: "left-4 top-16" },
  { id: "real-madrid", crest: "https://crests.football-data.org/86.png", position: "right-4 top-16" },
  { id: "manchester-city", crest: "https://crests.football-data.org/65.png", position: "left-4 bottom-28" },
  { id: "paris-saint-germain", crest: "https://crests.football-data.org/524.png", position: "right-4 bottom-28" },
];

const OUTER_BAND_CRESTS = [
  { id: "barcelona", crest: "https://crests.football-data.org/81.png", position: "left-[9%] top-[6%]" },
  { id: "liverpool", crest: "https://crests.football-data.org/64.png", position: "right-[9%] top-[6%]" },
  { id: "bayern-munich", crest: "https://crests.football-data.org/5.png", position: "left-[9%] top-[93%]" },
  { id: "juventus", crest: "https://crests.football-data.org/109.png", position: "right-[9%] top-[93%]" },
];

// Top edge, bottom edge, and a mid-height side-rail pair - the tier that
// turns the old "two side walls" look into crests running along the
// full top and bottom of the page.
const SPREAD_LG_CRESTS = [
  { id: "manchester-united", crest: "https://crests.football-data.org/66.png", position: "left-[36%] top-[5%]" },
  { id: "chelsea", crest: "https://crests.football-data.org/61.png", position: "right-[36%] top-[5%]" },
  { id: "borussia-dortmund", crest: "https://crests.football-data.org/4.png", position: "left-[36%] top-[93%]" },
  { id: "atletico-madrid", crest: "https://crests.football-data.org/78.png", position: "right-[36%] top-[93%]" },
  { id: "napoli", crest: "https://crests.football-data.org/113.png", position: "left-[4%] top-[50%]" },
  { id: "porto", crest: "https://crests.football-data.org/503.png", position: "right-[4%] top-[50%]" },
];

// A second side-rail level plus a closer-in ring level with the text.
// Only safe once the window is properly wide (xl breakpoint) - any
// narrower and these would start overlapping the text column.
const SPREAD_XL_CRESTS = [
  { id: "ac-milan", crest: "https://crests.football-data.org/98.png", position: "left-[6%] top-[26%]" },
  { id: "inter-milan", crest: "https://crests.football-data.org/108.png", position: "right-[6%] top-[26%]" },
  { id: "ajax", crest: "https://crests.football-data.org/678.png", position: "left-[18%] top-[50%]" },
  { id: "tottenham", crest: "https://crests.football-data.org/73.png", position: "right-[18%] top-[50%]" },
];

function CrestChip({
  crest,
  size,
}: {
  crest: string;
  size: number;
}) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative background art, not worth next/image's overhead here */}
      <img
        src={crest}
        alt=""
        aria-hidden="true"
        style={{ width: size * 0.56, height: size * 0.56 }}
        className="object-contain opacity-70"
      />
    </div>
  );
}

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
      </div>

      {/* DECORATIVE CRESTS */}
      {CORNER_CRESTS.map((club) => (
        <div key={club.id} className={`absolute z-0 ${club.position}`}>
          <CrestChip crest={club.crest} size={52} />
        </div>
      ))}
      {OUTER_BAND_CRESTS.map((club) => (
        <div key={club.id} className={`absolute z-0 hidden sm:block ${club.position}`}>
          <CrestChip crest={club.crest} size={72} />
        </div>
      ))}
      {SPREAD_LG_CRESTS.map((club) => (
        <div key={club.id} className={`absolute z-0 hidden lg:block ${club.position}`}>
          <CrestChip crest={club.crest} size={88} />
        </div>
      ))}
      {SPREAD_XL_CRESTS.map((club) => (
        <div key={club.id} className={`absolute z-0 hidden xl:block ${club.position}`}>
          <CrestChip crest={club.crest} size={64} />
        </div>
      ))}

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-[26px] shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
          style={{
            background: "linear-gradient(135deg, #4F46E5 0%, #0B0F1A 130%)",
          }}
        >
          <span className="text-[44px] font-black leading-none">C</span>
        </div>

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
