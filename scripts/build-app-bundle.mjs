#!/usr/bin/env node
// Builds Clubside's screens for the iPhone app (version 1.2 and later).
//
// The app no longer loads the website - it has the screens built in and
// only asks the website's API for data. Those screens are this same Next.js
// site, built as plain files ("static export") with:
//   - no API routes (the app calls the website's API instead),
//   - match pages as /match?id=123 (see src/lib/appLinks.ts),
//   - NEXT_PUBLIC_CLUBSIDE_APP=1.
// The build happens in a temporary copy, so nothing in the project changes.
//
//   node scripts/build-app-bundle.mjs --ios       puts the screens into the
//                                                 Xcode project (before an
//                                                 App Store upload)
//   node scripts/build-app-bundle.mjs --publish   puts them in public/app-bundle
//                                                 so the website serves them;
//                                                 the app downloads newer
//                                                 screens from there by itself
//                                                 (runs on every Vercel deploy)

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

// The oldest app build (CFBundleVersion) these screens work with. Raise it
// when the screens start using native code that older builds don't have.
const MIN_APP_BUILD = 4;

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const toIos = args.has("--ios");
const toPublic = args.has("--publish");

if (!toIos && !toPublic) {
  console.error("Use --ios and/or --publish");
  process.exit(1);
}

function listFiles(dir) {
  const files = [];
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(relative(dir, full).split(sep).join("/"));
    }
  };
  walk(dir);
  return files;
}

function commonParent(a, b) {
  const pa = a.split(sep);
  const pb = b.split(sep);
  const out = [];
  for (let i = 0; i < Math.min(pa.length, pb.length) && pa[i] === pb[i]; i++) out.push(pa[i]);
  return out.join(sep) || sep;
}

function build() {
  // Always the same folder: file names in the build depend on it, and the
  // same code should give exactly the same screens.
  const work = join(tmpdir(), "clubside-app-build");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  try {
    for (const name of ["src", "tsconfig.json", "postcss.config.mjs", "package.json"]) {
      cpSync(join(ROOT, name), join(work, name), { recursive: true });
    }
    // Files only the website needs stay out, to keep downloads small.
    const websiteOnly = [
      "app-bundle",
      "icons",
      "sw.js",
      "app-migrate.html",
      "brand/clubside-icon-master-1024.png",
      "file.svg",
      "globe.svg",
      "next.svg",
      "vercel.svg",
      "window.svg",
    ].map((name) => join(ROOT, "public", name));
    cpSync(join(ROOT, "public"), join(work, "public"), {
      recursive: true,
      filter: (src) => !websiteOnly.some((skip) => src === skip || src.startsWith(skip + sep)),
    });
    symlinkSync(join(ROOT, "node_modules"), join(work, "node_modules"), "dir");

    // Website-only parts.
    for (const gone of [
      "src/app/api",
      "src/app/match/[id]/page.tsx",
      "src/app/clubs/[id]/page.tsx",
      "src/app/robots.ts",
      "src/app/sitemap.ts",
      "src/app/manifest.ts",
    ]) {
      rmSync(join(work, gone), { recursive: true, force: true });
    }

    writeFileSync(
      join(work, "next.config.mjs"),
      `export default ${JSON.stringify(
        {
          output: "export",
          images: { unoptimized: true },
          env: { NEXT_PUBLIC_CLUBSIDE_APP: "1" },
          typescript: { ignoreBuildErrors: true },
          turbopack: { root: commonParent(work, ROOT) },
          experimental: { staleTimes: { dynamic: 20 } },
        },
        null,
        2
      )};\n`
    );
    // A fixed build id: the same code gives the same screens, so the app
    // only downloads when something really changed.
    const config = readFileSync(join(work, "next.config.mjs"), "utf8").replace(
      "export default {",
      'export default {\n  generateBuildId: async () => "clubside-app",'
    );
    writeFileSync(join(work, "next.config.mjs"), config);

    execFileSync(process.execPath, [join(ROOT, "node_modules/next/dist/bin/next"), "build"], {
      cwd: work,
      stdio: "inherit",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });

    const out = join(work, "out");
    const files = listFiles(out);
    const hash = createHash("sha256");
    for (const file of files) {
      hash.update(file);
      hash.update(readFileSync(join(out, file)));
    }
    const version = hash.digest("hex").slice(0, 12);
    writeFileSync(join(out, "app-bundle.json"), JSON.stringify({ version, minAppBuild: MIN_APP_BUILD }) + "\n");
    files.push("app-bundle.json");

    if (toIos) {
      const dest = join(ROOT, "ios/App/App/public");
      mkdirSync(dest, { recursive: true });
      for (const name of readdirSync(dest)) {
        if (name === "cordova.js" || name === "cordova_plugins.js") continue;
        rmSync(join(dest, name), { recursive: true, force: true });
      }
      cpSync(out, dest, { recursive: true });
      // Also kept in out-app/ (capacitor.config.ts' webDir), so a later
      // "npx cap sync" copies these same screens.
      rmSync(join(ROOT, "out-app"), { recursive: true, force: true });
      cpSync(out, join(ROOT, "out-app"), { recursive: true });
      console.log(`App screens ${version} copied into the Xcode project (${files.length} files).`);
    }

    if (toPublic) {
      const dest = join(ROOT, "public/app-bundle");
      rmSync(dest, { recursive: true, force: true });
      mkdirSync(dest, { recursive: true });
      cpSync(out, join(dest, version), { recursive: true });
      const manifest = {
        version,
        minAppBuild: MIN_APP_BUILD,
        builtAt: new Date().toISOString(),
        files: files.map((path) => ({ path, size: statSync(join(out, path)).size })),
      };
      writeFileSync(join(dest, "manifest.json"), JSON.stringify(manifest) + "\n");
      console.log(`App screens ${version} published to public/app-bundle (${files.length} files).`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

try {
  build();
} catch (error) {
  if (toPublic && !toIos) {
    // On Vercel: a problem here must not stop the website itself from
    // deploying - the app simply keeps the screens it has.
    console.warn("⚠️  Could not build the app screens - the website deploys anyway.");
    console.warn(error);
    process.exit(0);
  }
  throw error;
}
