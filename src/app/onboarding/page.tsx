"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clubs } from "../../data/clubs";
import { useClubs } from "../../context/ClubsContext";
import ClubBadge from "../../components/ClubBadge";

export default function Onboarding() {
  const [query, setQuery] = useState("");
  const { selectedIds, toggleClub } = useClubs();
  const router = useRouter();

  const filteredClubs = clubs.filter((club) =>
    club.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] px-6 py-10">
      <h1 className="text-2xl font-bold text-[#111111] mb-1">
        Choose your clubs
      </h1>
      <p className="text-[#6B6B6B] mb-6">
        Follow the teams you care about.
      </p>

      <input
        type="text"
        placeholder="Search clubs..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-full bg-white border border-zinc-200 px-4 py-3 mb-6 text-[#111111] outline-none"
      />

      <div className="flex flex-col gap-3">
        {filteredClubs.map((club) => {
          const isSelected = selectedIds.includes(club.id);
          return (
            <button
              key={club.id}
              onClick={() => toggleClub(club.id)}
              className={`flex items-center gap-4 rounded-2xl px-4 py-4 text-left transition-colors ${
                isSelected
                  ? "bg-black text-white"
                  : "bg-white text-[#111111] border border-zinc-200"
              }`}
            >
              <ClubBadge
                name={club.name}
                crest={club.crest}
                color={club.primaryColor}
                size={44}
              />

              <div className="flex-1">
                <div className="font-semibold">{club.name}</div>
                <div
                  className={`text-sm ${
                    isSelected ? "text-zinc-300" : "text-[#6B6B6B]"
                  }`}
                >
                  {club.country} · {club.league}
                </div>
              </div>
              <span className="text-xl">{isSelected ? "✓" : "+"}</span>
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          <span className="text-[#111111] font-medium">
            {selectedIds.length} club{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => router.push("/")}
            className="rounded-full bg-black text-white px-6 py-3 font-medium"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}