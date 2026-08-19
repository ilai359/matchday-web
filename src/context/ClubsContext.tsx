"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ClubsContextType = {
  selectedIds: string[];
  toggleClub: (id: string) => void;
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

  return (
    <ClubsContext.Provider value={{ selectedIds, toggleClub }}>
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