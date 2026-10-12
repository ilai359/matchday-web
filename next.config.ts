import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "crests.football-data.org",
      },
    ],
  },
  // This is the actual cause of "switching pages always waits, even going
  // back to one I was just on": every page in this app ("/", "/matches",
  // "/updates", "/clubs/[id]", etc.) is a client component, not a page
  // that fetches its own data on the server - but Next's client-side
  // Router Cache doesn't know that. By default (`dynamic: 0`, which is
  // what every <Link> here uses, since none of them set the `prefetch`
  // prop), Next treats every route as needing a fresh round-trip to the
  // server for its shell on literally every single navigation, no matter
  // how recently it was visited - that round-trip, not any data fetch
  // inside the page, is the wait. (`static: 300` already existed as the
  // default, but only applies to a <Link prefetch={true}>, which nothing
  // here uses.)
  //
  // Raising `dynamic` to match `static` removes that round-trip for
  // revisits within 5 minutes. This is safe to do with zero loss of
  // freshness here specifically: every page already re-fetches its own
  // real data on mount (see the persisted-cache + background-refetch
  // pattern used throughout, e.g. src/app/page.tsx) regardless of this
  // setting, and that's governed by its own cache TTLs (tuned
  // separately) - this setting only controls whether Next re-fetches the
  // route's own static shell before it can even show that page.
  experimental: {
    staleTimes: {
      dynamic: 300,
    },
  },
};

export default nextConfig;