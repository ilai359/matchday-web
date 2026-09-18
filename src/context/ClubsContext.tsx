"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

  function toggleClub(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

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