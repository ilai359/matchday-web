// Lets Vercel's own CDN keep a successful API answer for a short while
// and hand that same copy to everyone who asks for the same thing,
// instead of running the function (and hitting the cache database and
// football-data.org) once per visitor. This is what lets the app grow:
// with it, a league's match list is fetched about once a minute no matter
// whether 1 person or 10,000 people are looking at it - so the free
// limits (10 football-data.org requests a minute, the cache database's
// monthly allowance) stop depending on how many people use the app.
//
// `seconds` is how long a copy counts as fresh. For a while after that
// (`staleSeconds`), the CDN still answers instantly with the old copy and
// refreshes it in the background. Only ever used on successful answers,
// so an error is never handed out to other people.
export function cdnCacheHeaders(seconds: number, staleSeconds = seconds * 5): HeadersInit {
  return {
    "Cache-Control": `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`,
  };
}
