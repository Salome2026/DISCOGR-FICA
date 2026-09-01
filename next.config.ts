import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // docusign-esign ships as a legacy UMD module whose (dead, Node never
  // takes it) AMD branch confuses the bundler's static analysis into
  // treating its `define(['oauth/Account'], ...)` calls as real imports.
  // Excluding it from bundling and letting Node's native `require` load it
  // directly (which correctly falls through to the CommonJS branch) avoids
  // that entirely.
  // sharp ships native per-platform binaries (linux-x64, darwin-arm64, etc.)
  // resolved at runtime via dlopen — bundling it through Turbopack instead of
  // letting Node's native require() load it directly breaks that resolution
  // on Vercel ("ERR_DLOPEN_FAILED: libvips-cpp.so... no such file"), even
  // though the correct optional dependency is present in node_modules.
  serverExternalPackages: ["docusign-esign", "sharp"],
  // packages/shared is a raw-TypeScript workspace package (no build step —
  // the Expo mobile app consumes the same source via Metro) — this tells
  // Next to transpile it inline instead of expecting compiled JS.
  transpilePackages: ["@discografica/shared"],
};

export default nextConfig;
