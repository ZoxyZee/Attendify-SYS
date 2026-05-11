const { getDefaultConfig } = require("@expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...config.resolver.assetExts, "bin"];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "react-native-fs": path.resolve(__dirname, "src/shims/react-native-fs.js")
};

module.exports = withNativeWind(config, { input: "./global.css" });
