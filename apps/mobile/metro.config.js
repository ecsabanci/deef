// Expo monorepo Metro config (docs.expo.dev/guides/monorepos), adapted
// for pnpm. Watch the workspace root so hoisted deps and @deef/shared
// resolve. Hierarchical lookup stays ENABLED so pnpm's nested package
// deps (e.g. expo -> expo-modules-core) resolve.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// pnpm exposes more than one physical copy of react (the backend pulls
// 19.2.7, the mobile app 19.1.0). Two react instances mean the renderer
// and the components receive different hook dispatchers -> "Invalid hook
// call / useState of null". Force EVERY `react` and `react/*` request to
// the mobile app's single copy so exactly one react module is in the
// bundle. (react-native itself is already single-version.)
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    return context.resolveRequest(
      context,
      require.resolve(moduleName, { paths: [projectRoot] }),
      platform,
    );
  }
  return (defaultResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

module.exports = config;
