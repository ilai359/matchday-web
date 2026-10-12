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
  // Raising `dynamic` removes that round-trip for a revisit within the
  // window below. Originally set to 300 (5 minutes) - too long in
  // practice: Next's router cache doesn't just skip the shell
  // round-trip, it can also reuse the previous React instance outright
  // on some navigations (e.g. the browser/gesture back action), which
  // skips that page's own effects re-running too - meaning its on-mount
  // refetch (the thing that was supposed to make this safe) doesn't
  // happen either, and a time-sensitive page like the match detail one
  // can sit showing however-old a status it had last time for the whole
  // window. 20 seconds still removes the round-trip for genuine rapid
  // back-and-forth (the original complaint), while keeping that window
  // short enough that it's never the reason a score or match status
  // looks wrong.
  experimental: {
    staleTimes: {
      dynamic: 20,
    },
  },
};

export default nextConfig;