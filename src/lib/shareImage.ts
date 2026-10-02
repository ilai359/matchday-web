// Generates shareable PNGs for a match result/fixture and for a club's
// stats - something someone can post to a story, a group chat, or a
// feed, with "Clubside" on it, which is the whole point: a user sharing
// a result is free marketing for the app.

export type ShareMatchInput = {
  competition: string;
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
  homeScore: number | null;
  awayScore: number | null;
  statusLabel: string;
  dateLabel: string;
  homeCrest?: string;
  awayCrest?: string;
  // Oldest-first, same order as the pills shown on the match page.
  homeForm?: Array<"W" | "D" | "L">;
  awayForm?: Array<"W" | "D" | "L">;
  headToHead?: ShareHeadToHeadEntry[];
};

export type ShareHeadToHeadEntry = {
  dateLabel: string;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  homeCrest?: string;
  awayCrest?: string;
};

export type ShareClubInput = {
  name: string;
  league: string;
  country: string;
  color: string;
  crest?: string;
  position: number | null;
  played: number | null;
  won: number | null;
  draw: number | null;
  lost: number | null;
  points: number | null;
};

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

function initials(name: string): string {
  const words = name.trim().split(" ");
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

// Real crest images come from football-data.org's own server, and
// reading pixel data back out of a <canvas> after drawing an image from
// another origin only works if that server sends the right CORS header
// - get that wrong and sharing silently breaks for everyone with a
// cryptic "tainted canvas" security error. football-data.org's crest
// server doesn't send one (confirmed by testing it directly), so crests
// are loaded through Next's own image optimizer instead (the same one
// ClubBadge already uses via next/image) - that serves the image back
// from this app's own domain, which makes it same-origin and safe for
// canvas to read, with no CORS question at all. If a crest ever fails
// to load for any reason, every drawing function below falls back to
// the colored initials badge instead of failing the whole share.
//
// The width below has to be one of Next's own preconfigured image
// sizes (see next.config.ts's images.imageSizes/deviceSizes, or just
// Next's defaults when, like here, that's left unset) - it rejects any
// other width with a 400, which silently failed every crest load (and
// fell back to initials every time) until this was caught. 384 is one
// of Next's built-in default sizes.
const CREST_OPTIMIZE_WIDTH = 384;

function optimizedCrestUrl(src: string): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${CREST_OPTIMIZE_WIDTH}&q=75`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = optimizedCrestUrl(src);
  });
}

/** Loads every distinct crest URL once (several rows can share the same two clubs' crests) and returns a lookup from URL to the loaded image, skipping any that failed to load. */
async function loadCrests(urls: Array<string | undefined>): Promise<Map<string, HTMLImageElement>> {
  const distinct = Array.from(new Set(urls.filter((u): u is string => Boolean(u))));
  const loaded = await Promise.all(distinct.map((url) => loadImage(url)));
  const map = new Map<string, HTMLImageElement>();
  distinct.forEach((url, i) => {
    const img = loaded[i];
    if (img) map.set(url, img);
  });
  return map;
}

/** A color-gradient circle with initials - the fallback look, and also the only look, if no crest image was passed/loaded. */
function drawInitialsBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  label: string
) {
  const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "#111827");
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${Math.round(radius * 0.72)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + radius * 0.04);
}

/** The real crest, padded and clipped to a circle on a white backing (crests often have transparent backgrounds, which would otherwise pick up this card's dark background and look muddy - same reasoning as ClubBadge's white padded box in the app itself). Falls back to the initials badge above if no image was loaded for this club. */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  label: string,
  image?: HTMLImageElement
) {
  if (!image) {
    drawInitialsBadge(ctx, x, y, radius, color, label);
    return;
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  const box = radius * 1.4;
  const scale = Math.min(box / image.width, box / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `${color}4D`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  // Fallback for any canvas implementation without the native
  // roundRect method (added to all major browsers in 2022/2023, but
  // cheap to guard for).
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFormPills(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  form: Array<"W" | "D" | "L">
) {
  if (form.length === 0) return;
  const pillRadius = 21;
  const gap = 12;
  const totalWidth = form.length * (pillRadius * 2) + (form.length - 1) * gap;
  let x = centerX - totalWidth / 2 + pillRadius;
  for (const result of form) {
    ctx.beginPath();
    ctx.arc(x, y, pillRadius, 0, Math.PI * 2);
    ctx.fillStyle = result === "W" ? "#10B981" : result === "L" ? "#EF4444" : "#71717A";
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 ${Math.round(pillRadius * 0.85)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(result, x, y + 1);
    x += pillRadius * 2 + gap;
  }
}

/**
 * Renders to a generously tall scratch canvas, lets `draw` report back
 * how much of it it actually used, then copies just that much into a
 * correctly-sized final canvas. This is what lets the match card be
 * exactly as tall as it needs to be - short for a match with no
 * head-to-head history yet, taller for one with a full history and form
 * - instead of always being a fixed height with empty space at the
 * bottom, or needing a second, more complex pass to measure everything
 * before drawing it for real.
 */
async function renderCropped(
  width: number,
  maxHeight: number,
  draw: (ctx: CanvasRenderingContext2D) => Promise<number> | number
): Promise<Blob | null> {
  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = maxHeight;
  const ctx = scratch.getContext("2d");
  if (!ctx) return null;

  const usedHeight = Math.min(await draw(ctx), maxHeight);

  const final = document.createElement("canvas");
  final.width = width;
  final.height = usedHeight;
  const fctx = final.getContext("2d");
  if (!fctx) return null;
  fctx.drawImage(scratch, 0, 0, width, usedHeight, 0, 0, width, usedHeight);

  return new Promise((resolve) => {
    final.toBlob((blob) => resolve(blob), "image/png");
  });
}

/** Draws a match-result card (crests, score, head-to-head, recent form) and returns it as a PNG blob. */
export async function createMatchShareImage(match: ShareMatchInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const crests = await loadCrests([
    match.homeCrest,
    match.awayCrest,
    ...(match.headToHead ?? []).flatMap((h) => [h.homeCrest, h.awayCrest]),
  ]);

  const width = 1080;

  return renderCropped(width, 2000, (ctx) => {
    const bg = ctx.createLinearGradient(0, 0, width, 2000);
    bg.addColorStop(0, "#0B0D12");
    bg.addColorStop(1, "#080B13");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, 2000);

    glow(ctx, width * 0.24, 400, width * 0.42, match.homeColor);
    glow(ctx, width * 0.76, 400, width * 0.42, match.awayColor);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `800 28px ${FONT}`;
    ctx.fillText(match.competition.toUpperCase(), width / 2, 130);

    drawBadge(ctx, width * 0.27, 400, 125, match.homeColor, initials(match.homeName), match.homeCrest ? crests.get(match.homeCrest) : undefined);
    drawBadge(ctx, width * 0.73, 400, 125, match.awayColor, initials(match.awayName), match.awayCrest ? crests.get(match.awayCrest) : undefined);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 34px ${FONT}`;
    wrapLines(ctx, match.homeName, 280).forEach((line, i) => {
      ctx.fillText(line, width * 0.27, 575 + i * 40);
    });
    wrapLines(ctx, match.awayName, 280).forEach((line, i) => {
      ctx.fillText(line, width * 0.73, 575 + i * 40);
    });

    const hasScore = match.homeScore !== null && match.awayScore !== null;
    ctx.fillStyle = "#FFFFFF";
    if (hasScore) {
      ctx.font = `900 110px ${FONT}`;
      ctx.fillText(`${match.homeScore} – ${match.awayScore}`, width / 2, 450);
    } else {
      ctx.font = `900 64px ${FONT}`;
      ctx.fillText("VS", width / 2, 425);
    }

    ctx.font = `700 26px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(match.statusLabel.toUpperCase(), width / 2, hasScore ? 505 : 475);

    ctx.font = `600 24px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(match.dateLabel, width / 2, 780);

    let cursor = 860;

    if (match.headToHead && match.headToHead.length > 0) {
      ctx.font = `800 24px ${FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText("HEAD-TO-HEAD", width / 2, cursor);
      cursor += 46;

      const rowHeight = 148;
      for (const h of match.headToHead) {
        const rowTop = cursor;
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        roundRect(ctx, 60, rowTop, width - 120, rowHeight, 24);
        ctx.fill();

        ctx.font = `700 19px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "center";
        ctx.fillText(h.dateLabel, width / 2, rowTop + 34);

        const midY = rowTop + 100;
        drawBadge(ctx, width / 2 - 95, midY, 27, match.homeColor, initials(h.homeName), h.homeCrest ? crests.get(h.homeCrest) : undefined);
        drawBadge(ctx, width / 2 + 95, midY, 27, match.awayColor, initials(h.awayName), h.awayCrest ? crests.get(h.awayCrest) : undefined);

        ctx.font = `700 22px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textAlign = "right";
        ctx.fillText(truncate(h.homeName, 14), width / 2 - 135, midY + 7);
        ctx.textAlign = "left";
        ctx.fillText(truncate(h.awayName, 14), width / 2 + 135, midY + 7);

        ctx.font = `900 32px ${FONT}`;
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText(`${h.homeScore} – ${h.awayScore}`, width / 2, midY + 11);

        cursor = rowTop + rowHeight + 18;
      }
      cursor += 20;
    }

    const hasForm = (match.homeForm && match.homeForm.length > 0) || (match.awayForm && match.awayForm.length > 0);
    if (hasForm) {
      ctx.font = `800 24px ${FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.textAlign = "center";
      ctx.fillText("FORM", width / 2, cursor);
      cursor += 50;

      drawFormPills(ctx, width * 0.27, cursor, match.homeForm ?? []);
      drawFormPills(ctx, width * 0.73, cursor, match.awayForm ?? []);
      cursor += 62;
    }

    cursor += 36;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `900 36px ${FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Clubside", width / 2, cursor);
    cursor += 60;

    return cursor;
  });
}

/** Draws a square (1080x1080) club-stats card and returns it as a PNG blob. */
export async function createClubShareImage(club: ShareClubInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const crestImage = club.crest ? (await loadCrests([club.crest])).get(club.crest) : undefined;

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#0B0D12");
  bg.addColorStop(1, "#080B13");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  glow(ctx, size / 2, size * 0.32, size * 0.48, club.color);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText(`${club.league.toUpperCase()} · ${club.country.toUpperCase()}`, size / 2, 120);

  drawBadge(ctx, size / 2, 320, 130, club.color, initials(club.name), crestImage);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 54px ${FONT}`;
  wrapLines(ctx, club.name, 820).forEach((line, i) => {
    ctx.fillText(line, size / 2, 540 + i * 62);
  });

  if (club.position !== null) {
    ctx.font = `900 44px ${FONT}`;
    ctx.fillStyle = club.color;
    ctx.fillText(`#${club.position} in table`, size / 2, 660);
  }

  const stats: Array<[string, number | null]> = [
    ["P", club.played],
    ["W", club.won],
    ["D", club.draw],
    ["L", club.lost],
    ["PTS", club.points],
  ];
  const cellWidth = size / stats.length;
  const statsY = 800;
  stats.forEach(([label, value], i) => {
    const x = cellWidth * i + cellWidth / 2;
    ctx.font = `900 46px ${FONT}`;
    ctx.fillStyle = label === "PTS" ? club.color : "#FFFFFF";
    ctx.fillText(value === null ? "–" : String(value), x, statsY);
    ctx.font = `700 20px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(label, x, statsY + 36);
  });

  ctx.font = `900 36px ${FONT}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Clubside", size / 2, size - 64);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/**
 * Opens the device's native share sheet with the given image (so it can
 * go straight to Messages, WhatsApp, Instagram Stories, etc.) when the
 * browser supports sharing files - otherwise falls back to downloading
 * the image directly.
 */
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  shareText: string
): Promise<void> {
  try {
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], text: shareText });
      return;
    }
  } catch {
    // Fall through to a plain download below - this also covers the
    // user simply cancelling the share sheet, which throws too.
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
