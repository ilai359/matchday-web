export default function Settings() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24">
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
            Manage how Matchday looks and works.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400">
            Appearance
          </h2>

          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)]">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F4F7] text-lg">
                  ☀️
                </div>
                <div>
                  <div className="text-sm font-black text-[#111318]">Light</div>
                  <div className="text-[11px] font-medium text-zinc-400">
                    The current look
                  </div>
                </div>
              </div>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111318]">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4 opacity-50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F4F7] text-lg">
                  🌙
                </div>
                <div>
                  <div className="text-sm font-black text-[#111318]">Dark</div>
                  <div className="text-[11px] font-medium text-zinc-400">
                    Coming soon
                  </div>
                </div>
              </div>
              <div className="h-5 w-5 rounded-full border-2 border-zinc-200" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400">
            About
          </h2>

          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)]">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-bold text-zinc-500">Matchday</span>
              <span className="text-sm font-black text-[#111318]">v1.0</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}