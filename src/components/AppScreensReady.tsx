"use client";

import { useEffect } from "react";
import { confirmScreensLoaded } from "../lib/nativeApp";

// iPhone app only (does nothing on the website): once the screens have
// started, tells the app so - see confirmScreensLoaded in lib/nativeApp.ts.
export default function AppScreensReady() {
  useEffect(() => {
    confirmScreensLoaded();
  }, []);
  return null;
}
