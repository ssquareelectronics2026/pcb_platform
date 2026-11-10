import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-ibm-plex)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        surface: {
          page: "#f6f5f1",
          card: "#ffffff",
          raised: "#eeede8",
          vellum: "#fbfaf7",
          chassis: "#151514",
          panel: "#1f1e1c",
        },
        ink: {
          primary: "#161513",
          secondary: "#52504a",
          muted: "#76736c",
        },
        copper: {
          DEFAULT: "#9a6320",
          hover: "#7a4c14",
          bright: "#c89452",
        },
        solder: {
          DEFAULT: "#167c4c",
          bright: "#4cc38a",
        },
      },
      transitionTimingFunction: {
        unslop: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
