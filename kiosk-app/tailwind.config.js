module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        surface: "#030712",
        panel: "#0F172A",
        accent: "#0EA5E9",
        success: "#10B981",
        warning: "#F59E0B",
        muted: "#94A3B8"
      },
      boxShadow: {
        soft: "0 20px 50px rgba(2, 6, 23, 0.35)"
      }
    }
  },
  plugins: []
};
