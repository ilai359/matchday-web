"use client";

import { useEffect, useState } from "react";

/**
 * The current time, updated every `intervalMs` (default 30 seconds) while
 * the page is open - so a match drops out of "upcoming" lists right when
 * it kicks off, without reloading anything from the network.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
