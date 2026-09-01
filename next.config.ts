import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // docusign-esign ships as a legacy UMD module whose (dead, Node never
  // takes it) AMD branch confuses the bundler's static analysis into
  // treating its `define(['oauth/Account'], ...)` calls as real imports.
  // Excluding it from bundling and letting Node's native `require` load it
  // directly (which correctly falls through to the CommonJS branch) avoids
  // that entirely.
  //
  // sharp ships native per-platform binaries (linux-x64, darwin-arm64, etc.)
  // resolved at runtime via dlopen — same "let Node require it directly"
  // treatment. This alone isn't enough on Vercel though: Vercel's own file
  // tracer doesn't always pick up the dlopen'd .so files sharp depends on
  // (@img/sharp-libvips-linux-x64), producing "ERR_DLOPEN_FAILED:
  // libvips-cpp.so... no such file" even though the package is present in
  // node_modules — outputFileTracingIncludes below forces those files into
  // every function that transitively imports lib/staticMap.ts or
  // lib/imageResize.ts (the only two files that import sharp).
  //
  // The include keys are route globs matched against the route path itself
  // (picomatch) — "/api/tourmanager/**/*" requires at least one segment
  // *after* tourmanager, so it never matched the base "/api/tourmanager"
  // route (only "/api/tourmanager/genericas" and deeper). Same story for
  // "/api/playlists/ingest/**/*" vs. the base "/api/playlists/ingest" route,
  // which is its *only* route. Trailing "/**" (no extra "/*") matches both
  // the base path and everything under it.
  serverExternalPackages: ["docusign-esign", "sharp"],
  outputFileTracingIncludes: {
    "/api/tourmanager/**": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
    "/api/playlists/ingest/**": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
  // packages/shared is a raw-TypeScript workspace package (no build step —
  // the Expo mobile app consumes the same source via Metro) — this tells
  // Next to transpile it inline instead of expecting compiled JS.
  transpilePackages: ["@discografica/shared"],
};

export default nextConfig;
