import Link from "next/link";

// Plain-language privacy policy. Written to match exactly what the app
// actually does (checked in code, not assumed) - see NOTES.md if this
// ever needs updating after a real change to what data the app uses.
export default function Privacy() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F6F8] pb-24 dark:bg-[#0B0D12]">
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
            Privacy Policy
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-5 text-white/45">
            Last updated September 24, 2026.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            The short version
          </h2>
          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Clubside doesn&apos;t collect any personal data. There are no
              accounts, no tracking, and no analytics. The only things saved
              are your theme and followed clubs, and those stay on your own
              device.
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            What&apos;s stored on your device
          </h2>
          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Two things: which clubs you follow, and whether you use light
              or dark mode. Both are saved only in your browser, on your own
              device. They&apos;re never sent to us or anyone else.
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Where the match and news data comes from
          </h2>
          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Clubside pulls scores, standings, and news from outside data
              providers so it can show you up-to-date football information.
              This is one-way: we fetch public football data to display to
              you, we don&apos;t send any information about you to them.
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            No tracking or ads
          </h2>
          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              No analytics, no ads, no third-party trackers, and nothing is
              ever sold or shared. There&apos;s no sign-up, so we don&apos;t
              have your name, email, or any other personal details.
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Questions
          </h2>
          <div className="overflow-hidden rounded-[26px] border border-black/[0.045] bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,0.045)] dark:border-white/[0.06] dark:bg-[#14171F] dark:shadow-none">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Questions about this policy? Email{" "}
              <a
                href="mailto:kugelmann.ilai@gmail.com"
                className="font-bold text-[#111318] underline dark:text-white"
              >
                kugelmann.ilai@gmail.com
              </a>
              .
            </p>
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
