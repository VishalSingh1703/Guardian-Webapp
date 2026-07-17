import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Emergency palette
        danger: {
          DEFAULT: "#e11d2a",
          dark: "#b30f1b",
        },
        parking: {
          DEFAULT: "#f59e0b",
          dark: "#b45309",
        },
        ink: "#0b0d12",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.25)", opacity: "0" },
          "100%": { transform: "scale(1.25)", opacity: "0" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.6s cubic-bezier(0.66,0,0,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
