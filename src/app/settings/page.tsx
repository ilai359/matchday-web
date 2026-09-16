"use client";

import { useTheme } from "../../context/ThemeContext";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24 dark:bg-[#0B0D12]">
      <header className="relative overflow-hidden bg-[#080B13] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-8 pt-10">
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
            Account
          </div>
          <h1 className="text-[36px] font-black leading-none tracking-[-0.05em]">
            Settings
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-5 text-white/45">
            Manage how Clubside looks and works.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Appearance
          </h2>

          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F4F7] text-lg dark:bg-white/[0.06]">
                  ☀️
                </div>
                <div>
                  <div className="text-sm font-black text-[#111318] dark:text-white">
                    Light
                  </div>
                  <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    Bright and clean
                  </div>
                </div>
              </div>
              {theme === "light" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111318] dark:bg-white">
                  <div className="h-2 w-2 rounded-full bg-white dark:bg-[#0B0D12]" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-200 dark:border-white/15" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className="flex w-full items-center justify-between border-t border-zinc-100 px-5 py-4 text-left dark:border-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F4F7] text-lg dark:bg-white/[0.06]">
                  🌙
                </div>
                <div>
                  <div className="text-sm font-black text-[#111318] dark:text-white">
                    Dark
                  </div>
                  <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    Easier at night
                  </div>
                </div>
              </div>
              {theme === "dark" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111318] dark:bg-white">
                  <div className="h-2 w-2 rounded-full bg-white dark:bg-[#0B0D12]" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-200 dark:border-white/15" />
              )}
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            About
          </h2>

          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                Clubside
              </span>
              <span className="text-sm font-black text-[#111318] dark:text-white">
                v1.0
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}