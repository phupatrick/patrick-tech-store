import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        base: "#050816",
        panel: "#0d1329",
        line: "#243052",
        accent: "#4ade80",
        glow: "#38bdf8"
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(56, 189, 248, 0.25), 0 20px 60px rgba(7, 89, 133, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
