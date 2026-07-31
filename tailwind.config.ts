import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          900: "#090a0f",
          800: "#12141d",
          700: "#1a1d29",
          600: "#242938",
        },
        cyan: {
          glow: "#00f0ff",
        },
        amber: {
          glow: "#ff9900",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        display: ["var(--font-display)", "Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backdropBlur: {
        glass: "24px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
        "cyan-glow": "0 0 20px rgba(0, 240, 255, 0.4)",
        "amber-glow": "0 0 20px rgba(255, 153, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
