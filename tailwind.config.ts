import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0b",
        surface: "#141416",
        border: "#26262a",
        accent: "#5b8cff",
        muted: "#8a8a93",
        gold: "#e8b84b",
        "gold-dim": "#9a7d2e",
        hero: "#5E0ED7",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
