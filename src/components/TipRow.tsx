"use client";

import { useEffect } from "react";
import { recordResult, saveTip, tipPoints, useTips } from "../lib/predictions";
import { useNow } from "../lib/useNow";
import { haptic } from "../lib/nativeApp";

type Props = {
  matchId: string;
  kickoff: string;
  homeName: string;
  awayName: string;
  status?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  // "dark" sits on a coloured/dark card, "light" on a normal white card.
  tone?: "dark" | "light";
};

/** "Your tip": predict the score before kickoff, see your points after. */
export default function TipRow({
  matchId,
  kickoff,
  homeName,
  awayName,
  status,
  homeScore,
  awayScore,
  tone = "dark",
}: Props) {
  const tips = useTips();
  const tip = tips[matchId];
  const now = useNow(15_000);
  const started = new Date(kickoff).getTime() <= now;
  const finished = status === "FINISHED" && homeScore != null && awayScore != null;

  // Remember the final score for this tip as soon as it's known.
  useEffect(() => {
    if (finished && tip) recordResult(matchId, homeScore as number, awayScore as number);
  }, [finished, tip, matchId, homeScore, awayScore]);

  const dark = tone === "dark";
  const box = dark
    ? "border-white/10 bg-black/20 text-white"
    : "border-zinc-200 bg-white text-[#111318] dark:border-white/10 dark:bg-white/5 dark:text-white";
  const muted = dark ? "text-white/55" : "text-zinc-400 dark:text-zinc-500";

  // After kickoff: show the locked tip (or nothing if there wasn't one).
  if (started) {
    if (!tip) return null;
    const points = finished
      ? tipPoints({ ...tip, result: { home: homeScore as number, away: awayScore as number } })
      : null;
    const verdict =
      points === null
        ? "🔒 Locked"
        : points === 3
          ? "🎯 Exact score · +3"
          : points === 1
            ? "✅ Right result · +1"
            : "❌ 0 points";
    return (
      <div className={`mt-3 flex items-center justify-between rounded-2xl border px-3 py-2.5 ${box}`}>
        <span className={`text-[11px] font-black uppercase tracking-wider ${muted}`}>Your tip</span>
        <span className="text-sm font-black tabular-nums">
          {tip.home}–{tip.away}
          <span className={`ml-2 text-xs font-bold ${muted}`}>{verdict}</span>
        </span>
      </div>
    );
  }

  const home = tip?.home ?? 0;
  const away = tip?.away ?? 0;
  function change(side: "home" | "away", delta: number) {
    const next = {
      home: side === "home" ? Math.min(15, Math.max(0, home + delta)) : home,
      away: side === "away" ? Math.min(15, Math.max(0, away + delta)) : away,
    };
    haptic("selection");
    saveTip(matchId, { ...next, kickoff, homeName, awayName });
  }

  const stepBtn = dark
    ? "h-8 w-8 rounded-full bg-white/10 text-base font-black text-white active:scale-95"
    : "h-8 w-8 rounded-full bg-zinc-100 text-base font-black text-[#111318] active:scale-95 dark:bg-white/10 dark:text-white";

  function stepper(side: "home" | "away", value: number, label: string) {
    return (
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label={`${label} minus one`} className={stepBtn} onClick={() => change(side, -1)}>
          −
        </button>
        <span className={`w-6 text-center text-lg font-black tabular-nums ${tip ? "" : "opacity-40"}`}>{value}</span>
        <button type="button" aria-label={`${label} plus one`} className={stepBtn} onClick={() => change(side, 1)}>
          +
        </button>
      </div>
    );
  }

  return (
    <div className={`mt-3 rounded-2xl border px-3 py-2.5 ${box}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-black uppercase tracking-wider ${muted}`}>
          {tip ? "Your tip" : "Predict the score"}
        </span>
        <span className={`text-[10px] font-semibold ${muted}`}>Locks at kickoff · exact +3, result +1</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {stepper("home", home, homeName)}
        <span className={`text-xs font-black ${muted}`}>–</span>
        {stepper("away", away, awayName)}
      </div>
    </div>
  );
}
