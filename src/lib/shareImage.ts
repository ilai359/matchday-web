// Generates a shareable PNG for a match result/fixture - something
// someone can post to a story, a group chat, or a feed, with
// "Clubside" on it, which is the whole point: a user sharing a result
// is free marketing for the app.
//
// Deliberately drawn from colors and initials this app already owns
// (club.primaryColor, the same initials ClubBadge falls back to) rather
// than pulling in the real crest images. Those come from
// football-data.org's own server, and reading pixel data back out of a
// <canvas> after drawing an image from another origin only works if
// that server sends the right CORS header - get that wrong and sharing
// silently breaks for everyone with a cryptic "tainted canvas" security
// error. Colors + initials sidestep that risk entirely while still
// looking clean and unmistakably on-brand (it's the same look already
// used throughout the app as the no-crest fallback).

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

function drawBadge(
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

/** Draws a square (1080x1080) match-result card and returns it as a PNG blob. */
export async function createMatchShareImage(match: ShareMatchInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#0B0D12");
  bg.addColorStop(1, "#080B13");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  glow(ctx, size * 0.24, size * 0.4, size * 0.42, match.homeColor);
  glow(ctx, size * 0.76, size * 0.4, size * 0.42, match.awayColor);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText(match.competition.toUpperCase(), size / 2, 130);

  drawBadge(ctx, size * 0.27, 400, 125, match.homeColor, initials(match.homeName));
  drawBadge(ctx, size * 0.73, 400, 125, match.awayColor, initials(match.awayName));

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 34px ${FONT}`;
  wrapLines(ctx, match.homeName, 280).forEach((line, i) => {
    ctx.fillText(line, size * 0.27, 575 + i * 40);
  });
  wrapLines(ctx, match.awayName, 280).forEach((line, i) => {
    ctx.fillText(line, size * 0.73, 575 + i * 40);
  });

  const hasScore = match.homeScore !== null && match.awayScore !== null;
  ctx.fillStyle = "#FFFFFF";
  if (hasScore) {
    ctx.font = `900 110px ${FONT}`;
    ctx.fillText(`${match.homeScore} – ${match.awayScore}`, size / 2, 450);
  } else {
    ctx.font = `900 64px ${FONT}`;
    ctx.fillText("VS", size / 2, 425);
  }

  ctx.font = `700 26px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(match.statusLabel.toUpperCase(), size / 2, hasScore ? 505 : 475);

  ctx.font = `600 24px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(match.dateLabel, size / 2, 780);

  ctx.font = `900 36px ${FONT}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Clubside", size / 2, size - 64);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export type ShareClubInput = {
  name: string;
  league: string;
  country: string;
  color: string;
  position: number | null;
  played: number | null;
  won: number | null;
  draw: number | null;
  lost: number | null;
  points: number | null;
};

/** Draws a square (1080x1080) club-stats card and returns it as a PNG blob. */
export async function createClubShareImage(club: ShareClubInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

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

  drawBadge(ctx, size / 2, 320, 130, club.color, initials(club.name));

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
