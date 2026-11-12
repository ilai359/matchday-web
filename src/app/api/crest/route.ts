// Runs on Vercel's Edge Runtime - see the other API routes for why.
export const runtime = "edge";

// Club crests for the share images in the iPhone app. The app's built-in
// screens draw crests onto a picture, and iOS only allows that for images
// that say they may be used by other sites - football-data.org's crest
// server doesn't, so the crest is passed through here with that permission
// added. Only football-data.org crests, nothing else.
const ALLOWED_HOST = "crests.football-data.org";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Bad crest address", { status: 400 });
  }
  if (target.protocol !== "https:" || target.hostname !== ALLOWED_HOST) {
    return new Response("Not a crest", { status: 400 });
  }

  const upstream = await fetch(target.toString()).catch(() => null);
  if (!upstream || !upstream.ok) {
    return new Response("Crest not found", { status: 404 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      "Access-Control-Allow-Origin": "*",
      // Crests almost never change - keep them for a week.
      "Cache-Control": "public, max-age=604800, s-maxage=604800",
    },
  });
}
