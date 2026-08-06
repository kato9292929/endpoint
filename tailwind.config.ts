import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // White-based theme, matching the hero (white + purple).
        bg: "#fafafa", // page background (near-white)
        surface: "#ffffff", // cards / inputs
        border: "#ececeb", // hairline borders on white
        accent: "#5E0ED7", // deep purple (matches the hero)
        muted: "#6b6a70", // secondary text
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
