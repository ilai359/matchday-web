"use client";

import { useState } from "react";
import { updates, UpdateCategory } from "../../data/updates";
import { useClubs } from "../../context/ClubsContext";
import { getClub, getClubName } from "../../lib/clubHelpers";
import { formatDate, timeAgo } from "../../lib/dateHelpers";
import { categories, categoryStyles } from "../../lib/categoryStyles";
import ClubBadge from "../../components/ClubBadge";

export default function Updates() {
  const { selectedIds } = useClubs();

  const [activeCategory, setActiveCategory] = useState(
    "All" as UpdateCategory | "All"
  );

  const myUpdates = updates
    .filter((update) => selectedIds.includes(update.clubId))
    .filter(
      (update) =>
        activeCategory === "All" || update.category === activeCategory
    )
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime()
    );

  if (selectedIds.length === 0) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#070A12] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-blue-600/25 blur-[100px]" />
          <div className="absolute -right-40 top-24 h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-5 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-3xl backdrop-blur-xl">
            ⚡
          </div>

          <h1 className="mb-2 text-2xl font-black tracking-tight">
            No clubs selected
          </h1>

          <p className="mb-8 max-w-xs text-sm leading-6 text-white/50">
            Follow your clubs to see injuries, transfers, press updates,
            fixtures and match news here.
          </p>

          <button
            onClick={() => {
              window.location.href = "/onboarding";
            }}
            className="rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-black shadow-xl transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Choose clubs
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24">
      <header className="relative overflow-hidden bg-[#080B13] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
          <div className="absolute bottom-[-100px] left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-orange-500/10 blur-[80px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-8 pt-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
                Club feed
              </div>

              <h1 className="text-[36px] font-black leading-none tracking-[-0.05em]">
                Updates
              </h1>

              <p className="mt-3 max-w-xs text-sm leading-5 text-white/45">
                Everything happening around the clubs you follow.
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-xl backdrop-blur-xl">
              ⚡
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <section className="mb-7">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <h2 className="text-lg font-black text-[#111318]">
                Filter updates
              </h2>

              <p className="mt-0.5 text-xs font-medium text-zinc-400">
                Choose what you want to see
              </p>
            </div>

            <div className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-zinc-500 shadow-sm">
              {myUpdates.length} updates
            </div>
          </div>

          <div className="-mx-5 overflow-x-auto px-5 pb-2">
            <div className="flex w-max gap-2">
              {categories.map((category) => {
                const isActive = activeCategory === category;

                const style =
                  category === "All" ? undefined : categoryStyles[category];

                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                      isActive
                        ? "text-white shadow-lg"
                        : "border border-black/[0.05] bg-white text-zinc-600 shadow-sm"
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              category === "All"
                                ? "linear-gradient(135deg, #111827, #020617)"
                                : style?.gradient,
                          }
                        : undefined
                    }
                  >
                    {category !== "All" && (
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${
                          isActive ? "bg-white/15" : ""
                        }`}
                        style={
                          !isActive
                            ? {
                                backgroundColor: style?.background,
                                color: style?.color,
                              }
                            : undefined
                        }
                      >
                        {style?.icon}
                      </span>
                    )}

                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {myUpdates.length === 0 && (
          <section className="py-10">
            <div className="rounded-[28px] border border-black/[0.04] bg-white px-6 py-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-2xl">
                🔎
              </div>

              <h2 className="mb-2 text-lg font-black text-[#111318]">
                Nothing here yet
              </h2>

              <p className="mx-auto max-w-xs text-sm leading-6 text-zinc-500">
                There aren&apos;t any {activeCategory.toLowerCase()} updates
                from your clubs right now.
              </p>

              {activeCategory !== "All" && (
                <button
                  onClick={() => setActiveCategory("All")}
                  className="mt-5 rounded-xl bg-[#111318] px-5 py-2.5 text-xs font-black text-white"
                >
                  Show all updates
                </button>
              )}
            </div>
          </section>
        )}

        {myUpdates.length > 0 && (
          <section>
            <div className="mb-4">
              <h2 className="text-[22px] font-black tracking-tight text-[#111318]">
                Latest
              </h2>

              <p className="mt-0.5 text-xs font-medium text-zinc-400">
                Newest updates first
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {myUpdates.map((update, index) => {
                const club = getClub(update.clubId);

                const category =
                  categoryStyles[update.category] ?? categoryStyles.Club;

                const isNewest = index === 0;

                return (
                  <article
                    key={update.id}
                    className={`relative overflow-hidden rounded-[26px] border bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.08)] ${
                      isNewest
                        ? "border-blue-200/60"
                        : "border-black/[0.045]"
                    }`}
                  >
                    <div
                      className="h-1.5 w-full"
                      style={{ background: category.gradient }}
                    />

                    <div className="p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <ClubBadge
                            name={getClubName(update.clubId)}
                            crest={club?.crest}
                            color={club?.primaryColor}
                            size={44}
                          />

                          <div className="min-w-0">
                            {isNewest && (
                              <div className="mb-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-blue-500">
                                Latest update
                              </div>
                            )}

                            <div className="truncate text-sm font-black text-[#111318]">
                              {getClubName(update.clubId)}
                            </div>

                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">
                              <span>{formatDate(update.publishedAt)}</span>
                              <span>·</span>
                              <span>{timeAgo(update.publishedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5"
                          style={{
                            backgroundColor: category.background,
                            color: category.color,
                          }}
                        >
                          <span className="text-[13px]">{category.icon}</span>

                          <span className="text-[9px] font-black uppercase tracking-wider">
                            {update.category}
                          </span>
                        </div>
                      </div>

                      <h3 className="mb-2 text-[17px] font-black leading-snug tracking-[-0.015em] text-[#111318]">
                        {update.title}
                      </h3>

                      <p className="text-[13px] leading-[1.7] text-zinc-500">
                        {update.summary}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                        <div className="min-w-0">
                          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-300">
                            Source
                          </div>

                          <div className="mt-0.5 truncate text-[11px] font-semibold text-zinc-500">
                            {update.source}
                          </div>
                        </div>

                        <button
                          className="shrink-0 rounded-xl px-3 py-2 text-[11px] font-black transition-opacity hover:opacity-70"
                          style={{
                            backgroundColor: category.background,
                            color: category.color,
                          }}
                        >
                          Read more →
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}