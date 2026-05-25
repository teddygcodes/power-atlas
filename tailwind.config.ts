import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Command-center palette: deep slate base, restrained accents.
        atlas: {
          bg: "#0a0e14",
          panel: "#11161f",
          panelRaised: "#161d28",
          border: "#222c3a",
          grid: "#1b2430",
          text: "#d6dde6",
          muted: "#8a97a8",
          dim: "#5b6675",
        },
        // Honest signal colors (no "risk %" semantics, just feature identity).
        signal: {
          substation: "#5ec8d8",
          transmission: "#e0a458",
          plant: "#9b8cce",
          campus: "#f2f4f7",
          candidate: "#ff6b5e",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
