// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require("expo/metro-config");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// packages/shared lives outside this app's own directory (apps/mobile is
// deliberately NOT an npm workspace member — see the root package.json's
// comment) — Metro only watches files under projectRoot by default, so the
// shared package needs to be added explicitly or edits there won't trigger
// a reload.
config.watchFolders = [path.resolve(workspaceRoot, "packages/shared")];

// Resolve "@discografica/shared" straight to its source — there's no
// node_modules symlink to follow since it isn't a workspace member here.
config.resolver.extraNodeModules = {
  "@discografica/shared": path.resolve(workspaceRoot, "packages/shared"),
};

module.exports = config;
