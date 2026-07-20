import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme, tuned to the hero's off-white + purple aesthetic.
        bg: "#f5f4f2", // page background (warm off-white)
        surface: "#ffffff", // cards / inputs
        border: "#e4e1dc", // hairline borders on light
        accent: "#5E0ED7", // deep purple (matches the hero)
        muted: "#6b6a70", // secondary text on light
        gold: "#a97b12", // featured (x402 Inc.) — readable on white
        "gold-dim": "#7f5c0d",
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
