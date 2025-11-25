import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        hippo: {
          ink: "#020617",
          sky: "#020617",
          skyAlt: "#0b1120",
          accent: "#ff7e3a",
          accentSoft: "#ffe7d3",
          accentBlue: "#2563eb",
          accentPurple: "#7c3aed",
          accentTeal: "#14b8a6",
          card: "#ffffff",
          border: "#e5e7eb",
          chipBg: "#eef2ff"
        }
      }
    }
  },
  plugins: []
};

export default config;


