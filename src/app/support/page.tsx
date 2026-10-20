import Link from "next/link";

// Support page for the App Store listing's required support URL.
export default function Support() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-4 dark:bg-[#0B0D12]">
      <header className="relative overflow-hidden bg-[#080B13] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-600/25 blur-[90px]" />
          <div className="absolute -right-24 -top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 pb-8 pt-10">
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/70">
            Clubside
          </div>
          <h1 className="text-[36px] font-black leading-none tracking-[-0.05em]">
            Support
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-5 text-white/45">
            Questions, bugs, or feedback - here&apos;s how to reach me.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Contact
          </h2>
          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Clubside is a one-person project. If something&apos;s broken,
              a score looks wrong, or you have an idea for the app, email{" "}
              <a
                href="mailto:tidewavegames@gmail.com"
                className="font-bold text-[#111318] underline dark:text-white"
              >
                tidewavegames@gmail.com
              </a>{" "}
              and I&apos;ll get back to you.
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Common questions
          </h2>
          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <div className="px-5 py-4">
              <p className="text-sm font-bold text-[#111318] dark:text-white">
                Not getting notifications?
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Check that notifications are turned on for Clubside in your
                device&apos;s Settings app, and that you&apos;ve followed at
                least one club in the app&apos;s Settings tab.
              </p>
            </div>
            <div className="h-px bg-black/[0.045] dark:bg-white/[0.06]" />
            <div className="px-5 py-4">
              <p className="text-sm font-bold text-[#111318] dark:text-white">
                A score or fixture looks wrong
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Match data comes from a third-party football data provider.
                It&apos;s usually right, but email the details above and
                I&apos;ll take a look.
              </p>
            </div>
          </div>
        </section>

        <Link
          href="/settings"
          className="mx-1 inline-block text-sm font-bold text-zinc-500 underline dark:text-zinc-400"
        >
          Back to Settings
        </Link>
      </div>
    </main>
  );
}
