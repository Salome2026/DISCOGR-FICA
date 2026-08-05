import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // docusign-esign ships as a legacy UMD module whose (dead, Node never
  // takes it) AMD branch confuses the bundler's static analysis into
  // treating its `define(['oauth/Account'], ...)` calls as real imports.
  // Excluding it from bundling and letting Node's native `require` load it
  // directly (which correctly falls through to the CommonJS branch) avoids
  // that entirely.
  serverExternalPackages: ["docusign-esign"],
};

export default nextConfig;
