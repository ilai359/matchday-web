"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { clubs } from "../../data/clubs";
import { useClubs } from "../../context/ClubsContext";
import ClubBadge from "../../components/ClubBadge";

export default function Clubs() {
  const [query, setQuery] = useState("");
  const { selectedIds, toggleClub } = useClubs();

  const clubRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const clickedClub = useRef<{
    id: string;
    top: number;
  } | null>(null);

  const followedClubs = clubs.filter((club) =>
    selectedIds.includes(club.id)
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredClubs = clubs.filter((club) => {
    if (!normalizedQuery) return true;

    return (
      club.name.toLowerCase().includes(normalizedQuery) ||
      club.country.toLowerCase().includes(normalizedQuery) ||
      club.league.toLowerCase().includes(normalizedQuery)
    );
  });

  useLayoutEffect(() => {
    if (!clickedClub.current) return;

    const { id, top } = clickedClub.current;
    const element = clubRefs.current[id];

    if (element) {
      const newTop = element.getBoundingClientRect().top;
      const difference = newTop - top;

      if (difference !== 0) {
        window.scrollBy({
          top: difference,
          left: 0,
          behavior: "instant",
        });
      }
    }

    clickedClub.current = null;
  }, [selectedIds]);

  function handleListToggle(id: string) {
    const element = clubRefs.current[id];

    if (element) {
      clickedClub.current = {
        id,
        top: element.getBoundingClientRect().top,
      };
    }

    toggleClub(id);
  }

  function handleFollowingToggle(id: string) {
    toggleClub(id);
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24"
      style={{ overflowAnchor: "none" }}
    >
      {/* HEADER */}
      <header className="relative overflow-hidden bg-[#080B13] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
          <div className="absolute bottom-[-120px] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[90px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-8 pt-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
                Your teams
              </div>

              <h1 className="text-[36px] font-black leading-none tracking-[-0.05em]">
                My Clubs
              </h1>

              <p className="mt-3 max-w-xs text-sm leading-5 text-white/45">
                Choose the clubs you want Matchday to follow.
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-xl backdrop-blur-xl">
              🏟️
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/[0.08] px-3.5 py-2 backdrop-blur-xl">
              <span className="text-sm font-black">
                {followedClubs.length}
              </span>

              <span className="ml-1.5 text-xs font-semibold text-white/45">
                {followedClubs.length === 1 ? "club" : "clubs"} followed
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        {/* FOLLOWING */}
        {followedClubs.length > 0 && (
          <section className="mb-9">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-[22px] font-black tracking-tight text-[#111318]">
                  Following
                </h2>

                <p className="mt-0.5 text-xs font-medium text-zinc-400">
                  Clubs in your Matchday feed
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm text-white shadow-lg shadow-emerald-500/20">
                ✓
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {followedClubs.map((club) => {
                const clubColor = club.primaryColor ?? "#111827";

                return (
                  <article
                    key={club.id}
                    className="relative overflow-hidden rounded-[24px] border border-black/[0.045] bg-white shadow-[0_5px_20px_rgba(0,0,0,0.035)]"
                  >
                    <div
                      className="absolute bottom-0 left-0 top-0 w-1"
                      style={{ backgroundColor: clubColor }}
                    />

                    <div className="flex items-center gap-4 p-4 pl-5">
                      <ClubBadge
                        name={club.name}
                        crest={club.crest}
                        color={club.primaryColor}
                        size={48}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-black text-[#111318]">
                          {club.name}
                        </div>

                        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-zinc-400">
                          <span className="truncate">{club.country}</span>
                          <span className="shrink-0 text-zinc-300">·</span>
                          <span className="truncate">{club.league}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFollowingToggle(club.id)}
                        className="group shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700 transition-all hover:bg-red-50 hover:text-red-600 active:scale-95"
                        aria-label={`Unfollow ${club.name}`}
                      >
                        <span className="group-hover:hidden">
                          ✓ Following
                        </span>

                        <span className="hidden group-hover:inline">
                          Unfollow
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ADD ANOTHER CLUB */}
        <section>
          <div className="mb-4">
            <h2 className="text-[22px] font-black tracking-tight text-[#111318]">
              {followedClubs.length > 0
                ? "Add another club"
                : "Choose your clubs"}
            </h2>

            <p className="mt-0.5 text-xs font-medium text-zinc-400">
              Search by club, league or country
            </p>
          </div>

          {/* SEARCH */}
          <div className="relative mb-5">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
              🔎
            </div>

            <input
              type="text"
              placeholder="Search clubs..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-2xl border border-black/[0.05] bg-white py-4 pl-11 pr-11 text-sm font-semibold text-[#111318] shadow-sm outline-none transition-all placeholder:font-medium placeholder:text-zinc-300 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />

            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#F1F3F7] text-sm font-bold text-zinc-400 transition hover:bg-zinc-200"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* SEARCH RESULT COUNT */}
          {query.trim() && filteredClubs.length > 0 && (
            <div className="mb-3 px-1 text-[11px] font-bold text-zinc-400">
              {filteredClubs.length}{" "}
              {filteredClubs.length === 1
                ? "club found"
                : "clubs found"}
            </div>
          )}

          {/* EMPTY SEARCH */}
          {filteredClubs.length === 0 && (
            <div className="rounded-[28px] border border-black/[0.04] bg-white px-6 py-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl">
                🔎
              </div>

              <h3 className="mb-2 text-lg font-black text-[#111318]">
                No clubs found
              </h3>

              <p className="mx-auto max-w-xs text-sm leading-6 text-zinc-500">
                We couldn&apos;t find a club matching
                {query.trim() ? (
                  <>
                    {" "}
                    <span className="font-bold text-zinc-700">
                      &quot;{query}&quot;
                    </span>
                  </>
                ) : (
                  " your search"
                )}
                .
              </p>

              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-5 rounded-xl bg-[#111318] px-5 py-2.5 text-xs font-black text-white transition active:scale-95"
              >
                Clear search
              </button>
            </div>
          )}

          {/* CLUB LIST */}
          <div className="flex flex-col gap-3">
            {filteredClubs.map((club) => {
              const isSelected = selectedIds.includes(club.id);
              const clubColor = club.primaryColor ?? "#111827";

              return (
                <div
                  key={club.id}
                  ref={(element) => {
                    clubRefs.current[club.id] = element;
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleListToggle(club.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleListToggle(club.id);
                    }
                  }}
                  className={`group relative w-full cursor-pointer overflow-hidden rounded-[24px] border p-4 text-left shadow-[0_5px_20px_rgba(0,0,0,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.07)] active:scale-[0.995] ${
                    isSelected
                      ? "border-transparent text-white"
                      : "border-black/[0.045] bg-white text-[#111318]"
                  }`}
                  style={
                    isSelected
                      ? {
                          background: `linear-gradient(135deg, ${clubColor}, #111827 85%)`,
                        }
                      : undefined
                  }
                >
                  {/* COLOR STRIPE */}
                  {!isSelected && (
                    <div
                      className="absolute bottom-0 left-0 top-0 w-1"
                      style={{ backgroundColor: clubColor }}
                    />
                  )}

                  {/* SELECTED GLOWS */}
                  {isSelected && (
                    <>
                      <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-white/15 blur-[45px]" />
                      <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-black/20 blur-[45px]" />
                    </>
                  )}

                  <div className="relative z-10 flex items-center gap-4">
                    {/* CLUB LOGO - NOT CLICKABLE */}
                    <div
                      className="shrink-0 cursor-default"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <ClubBadge
                        name={club.name}
                        crest={club.crest}
                        color={club.primaryColor}
                        size={48}
                      />
                    </div>

                    {/* CLUB DETAILS */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-black">
                        {club.name}
                      </div>

                      <div
                        className={`mt-1 flex min-w-0 items-center gap-1.5 text-xs ${
                          isSelected
                            ? "text-white/55"
                            : "text-zinc-400"
                        }`}
                      >
                        <span className="truncate">
                          {club.country}
                        </span>

                        <span
                          className={
                            isSelected
                              ? "text-white/25"
                              : "text-zinc-300"
                          }
                        >
                          ·
                        </span>

                        <span className="truncate">
                          {club.league}
                        </span>
                      </div>
                    </div>

                    {/* ADD / REMOVE BUTTON */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleListToggle(club.id);
                      }}
                      aria-label={
                        isSelected
                          ? `Unfollow ${club.name}`
                          : `Follow ${club.name}`
                      }
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black transition-all hover:scale-105 active:scale-90 ${
                        isSelected
                          ? "border border-white/10 bg-white/15 text-white hover:bg-white/25"
                          : "bg-[#F1F3F7] text-zinc-600 hover:bg-[#E4E7EC]"
                      }`}
                    >
                      {isSelected ? "✓" : "+"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}