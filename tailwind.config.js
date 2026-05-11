module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        panel: "#ffffff",
        surface: "#f8fafc",
        primary: "#4F46E5",
        accent: "#0f172a",
        success: "#059669",
        warning: "#d97706",
        danger: "#dc2626"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
        float: "0 18px 40px rgba(79, 70, 229, 0.16)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(79,70,229,0.18), transparent 32%), radial-gradient(circle at 85% 20%, rgba(14,165,233,0.16), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.96))"
      },
      fontFamily: {
        sans: ["Sora", "IBM Plex Sans", "sans-serif"]
      }
    }
  },
  plugins: []
};
