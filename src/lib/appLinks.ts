// Links and addresses that differ between the website and the iPhone app.
//
// From app version 1.2 the iPhone app keeps Clubside's screens on the phone
// itself (built by scripts/build-app-bundle.mjs, which sets
// NEXT_PUBLIC_CLUBSIDE_APP=1) instead of loading them from the website. That
// build has one page for all matches and one for all clubs, so there a match
// is /match?id=123 and a club /club?id=ajax, instead of /match/123 and
// /clubs/ajax. Everything else (the website, and app versions up to 1.1,
// which load the website) keeps the normal addresses.

export const SITE_URL = "https://matchday-web-zeta.vercel.app";

export const IS_APP_BUNDLE = process.env.NEXT_PUBLIC_CLUBSIDE_APP === "1";

/** Link to a match's page. */
export function matchHref(id: string | number): string {
  return IS_APP_BUNDLE
    ? `/match?id=${encodeURIComponent(String(id))}`
    : `/match/${id}`;
}

/** Link to a club's page. */
export function clubHref(id: string): string {
  return IS_APP_BUNDLE ? `/club?id=${encodeURIComponent(id)}` : `/clubs/${id}`;
}

/** Turns a website path (e.g. from a notification) into the right in-app path. */
export function toAppPath(path: string): string {
  if (!IS_APP_BUNDLE) return path;
  const match = path.match(/^\/match\/([^/?#]+)\/?$/);
  if (match) return matchHref(decodeURIComponent(match[1]));
  const club = path.match(/^\/clubs\/([^/?#]+)\/?$/);
  if (club) return clubHref(decodeURIComponent(club[1]));
  return path;
}

/** Full address of an API route - the API always lives on the website. */
export function apiUrl(path: string): string {
  return IS_APP_BUNDLE ? `${SITE_URL}${path}` : path;
}
