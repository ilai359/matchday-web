// "Your tip" - predicting the score before kickoff. Saved on the phone
// only (no account): 3 points for the exact score, 1 for the right
// result (who wins, or a draw), 0 otherwise. A tip locks at kickoff.

import { useSyncExternalStore } from "react";

export type Tip = {
  home: number;
  away: number;
  kickoff: string;
  homeName: string;
  awayName: string;
  // Final score, filled in once the match is seen finished.
  result?: { home: number; away: number };
};

type TipMap = Record<string, Tip>;

const STORAGE_KEY = "clubside-tips";
const CHANGE_EVENT = "clubside-tips-changed";

function readRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

export function readTips(): TipMap {
  try {
    const parsed = JSON.parse(readRaw());
    return parsed && typeof parsed === "object" ? (parsed as TipMap) : {};
  } catch {
    return {};
  }
}

function writeTips(tips: TipMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tips));
  } catch {
    // Storage full or blocked - the tip just isn't kept.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveTip(matchId: string, tip: Tip): void {
  const tips = readTips();
  // Never change a tip after kickoff.
  if (new Date(tip.kickoff).getTime() <= Date.now()) return;
  tips[matchId] = { ...tips[matchId], ...tip };
  writeTips(tips);
}

/** Stores a finished match's score for its tip (if there is one). */
export function recordResult(matchId: string, home: number, away: number): void {
  const tips = readTips();
  const tip = tips[matchId];
  if (!tip || (tip.result && tip.result.home === home && tip.result.away === away)) return;
  tips[matchId] = { ...tip, result: { home, away } };
  writeTips(tips);
}

export function tipPoints(tip: Tip): number | null {
  if (!tip.result) return null;
  const { home, away } = tip.result;
  if (tip.home === home && tip.away === away) return 3;
  const outcome = (h: number, a: number) => Math.sign(h - a);
  return outcome(tip.home, tip.away) === outcome(home, away) ? 1 : 0;
}

export function tipsSummary(tips: TipMap): { points: number; streak: number; settled: number; total: number } {
  const all = Object.values(tips);
  const settled = all
    .filter((tip) => tip.result)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  let points = 0;
  for (const tip of settled) points += tipPoints(tip) ?? 0;
  // Correct tips in a row, counting back from the most recent.
  let streak = 0;
  for (let i = settled.length - 1; i >= 0; i--) {
    if ((tipPoints(settled[i]) ?? 0) > 0) streak++;
    else break;
  }
  return { points, streak, settled: settled.length, total: all.length };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** All tips, kept up to date when they change anywhere in the app. */
export function useTips(): TipMap {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "{}");
  try {
    return JSON.parse(raw) as TipMap;
  } catch {
    return {};
  }
}
