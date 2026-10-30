"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import {
  isNativePushApp,
  maybeAskForNotificationsOnce,
  updatePushClubs,
} from "../lib/pushClient";
import { haptic, saveWidgetData } from "../lib/nativeApp";

type ClubsContextType = {
  selectedIds: string[];
  toggleClub: (id: string) => void;
  resetClubs: () => void;
  // True once the saved selection has been read from the browser. Pages
  // that decide what to show based on "has this person picked any clubs
  // yet" (the home page, redirecting to /onboarding) need this - without
  // it, selectedIds briefly looks empty for every returning visitor too,
  // for the instant before their real saved list loads in.
  loaded: boolean;
};

const ClubsContext = createContext<ClubsContextType | undefined>(undefined);

const STORAGE_KEY = "matchday-selected-clubs";

export function ClubsProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load saved selection from the browser once, when the app starts
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedIds(JSON.parse(stored));
    }
    setLoaded(true);
  }, []);

  // Save selection to the browser every time it changes
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
    }
  }, [selectedIds, loaded]);

  // Always the latest selection, for code that finishes after a delay
  // (e.g. someone answering the notification prompt while they keep
  // picking clubs during onboarding).
  const latestIds = useRef<string[]>(selectedIds);
  useEffect(() => {
    latestIds.current = selectedIds;
  }, [selectedIds]);

  // Keeps the server's "which clubs should this device get alerts for"
  // list in step with the clubs actually followed, from anywhere in the
  // app - not just while Settings is open, which used to mean someone
  // who allowed alerts on their first follow only ever got alerts for
  // that one club. Short delay so tapping several clubs in a row sends
  // one update, not one per tap. Does nothing on a device that hasn't
  // turned alerts on.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      updatePushClubs(selectedIds).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [selectedIds, loaded]);

  // iPhone app: anyone who already follows clubs but has never been
  // asked about notifications (e.g. updating from the first app version,
  // which couldn't do them) gets asked once, a moment after the app
  // opens - so alerts are on by default as far as possible, without
  // anyone needing to find the toggle in Settings.
  const askedOnLaunch = useRef(false);
  useEffect(() => {
    if (!loaded || askedOnLaunch.current || !isNativePushApp()) return;
    if (latestIds.current.length === 0) return;
    askedOnLaunch.current = true;
    const timer = setTimeout(() => {
      maybeAskForNotificationsOnce(latestIds.current)
        .then((subscribed) => {
          if (subscribed) return updatePushClubs(latestIds.current);
        })
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [loaded]);

  function toggleClub(id: string) {
    const isFirstEverFollow = selectedIds.length === 0 && !selectedIds.includes(id);
    haptic(selectedIds.includes(id) ? "light" : "success");

    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

    // The moment someone follows their very first club is the natural
    // point to ask for notification permission - there's finally
    // something to notify them about, and it doesn't require them to
    // separately find the toggle in Settings. This only ever fires
    // once per device (see maybeAskForNotificationsOnce) -
    // Settings still has the toggle any time after, including to turn
    // it on if this moment was missed or dismissed.
    if (isFirstEverFollow) {
      maybeAskForNotificationsOnce([id])
        .then((subscribed) => {
          // They may have followed more clubs while the prompt was up.
          if (subscribed) return updatePushClubs(latestIds.current);
        })
        .catch(() => {});
    }
  }

  // iPhone app: keeps the home-screen widget (and the offline screen) in
  // step with the clubs followed - right away when they change, and every
  // few minutes while the app is open.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    const sync = () => {
      const ids = latestIds.current;
      if (ids.length === 0) {
        saveWidgetData([], null).catch(() => {});
        return;
      }
      fetch(`/api/widget?clubs=${encodeURIComponent(ids.join(","))}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (!cancelled && payload) return saveWidgetData(ids, payload);
        })
        .catch(() => {
          // Offline: keep what's already saved on the phone.
        });
    };
    const timer = setTimeout(sync, 1500);
    const interval = setInterval(sync, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [selectedIds, loaded]);

  function resetClubs() {
    setSelectedIds([]);
  }

  return (
    <ClubsContext.Provider
      value={{ selectedIds, toggleClub, resetClubs, loaded }}
    >
      {children}
    </ClubsContext.Provider>
  );
}

export function useClubs() {
  const context = useContext(ClubsContext);
  if (!context) {
    throw new Error("useClubs must be used inside a ClubsProvider");
  }
  return context;
}