"use client";

import { useEffect } from "react";
import { recordResult, tipsSummary, useTips } from "../lib/predictions";
import { fetchLiveMatchStatus } from "../lib/footballApi";

type FinishedInfo = {
  id: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
};

/** Points and streak from "Your tip" predictions, for the Matches header. */
export default function TipsSummary({ matches }: { matches: FinishedInfo[] }) {
  const tips = useTips();

  // Fill in final scores from the matches already loaded on this page.
  useEffect(() => {
    for (const match of matches) {
      if (
        match.status === "FINISHED" &&
        match.homeScore !== null &&
        match.awayScore !== null &&
        tips[match.id] &&
        !tips[match.id].result
      ) {
        recordResult(match.id, match.homeScore, match.awayScore);
      }
    }
  }, [matches, tips]);

  // Tips for older matches that aren't on this page anymore: look up the
  // final score once (a few at a time).
  useEffect(() => {
    const cutoff = Date.now() - 2.5 * 60 * 60 * 1000;
    const pending = Object.entries(tips)
      .filter(([, tip]) => !tip.result && new Date(tip.kickoff).getTime() < cutoff)
      .slice(0, 5);
    let cancelled = false;
    for (const [id] of pending) {
      fetchLiveMatchStatus(id)
        .then((status) => {
          if (
            !cancelled &&
            status?.status === "FINISHED" &&
            status.homeScore !== null &&
            status.awayScore !== null
          ) {
            recordResult(id, status.homeScore, status.awayScore);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [tips]);

  const summary = tipsSummary(tips);
  if (summary.total === 0) {
    return (
      <p className="mt-3 text-xs font-semibold text-white/55">
        🎯 Predict the score of your clubs&apos; matches · exact +3, result +1
      </p>
    );
  }
  return (
    <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-black text-white">
      <span>🎯 {summary.points} pts</span>
      {summary.streak > 1 && <span>🔥 {summary.streak} in a row</span>}
      <span className="font-semibold text-white/55">
        {summary.settled}/{summary.total} tips scored
      </span>
    </div>
  );
}
