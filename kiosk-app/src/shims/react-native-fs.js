module.exports = {
  readFile: async () => {
    throw new Error("react-native-fs is not available in this Expo project.");
  },
  writeFile: async () => {
    throw new Error("react-native-fs is not available in this Expo project.");
  }
};
