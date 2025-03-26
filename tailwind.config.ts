import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      gridTemplateRows: {
        "layout-desktop": "minmax(64px, auto) auto",
        "layout-mobile": "minmax(64px, auto) auto",
      },
      gridTemplateColumns: {
        "layout-desktop": "fit-content(200px) minmax(0, 1fr)",
        "layout-mobile": "auto",
      },
      boxShadow: {
        "outline": '0 0 0 4px theme(colors.accent.DEFAULT)',
      },
      fontFamily: {
        sans: ["var(--font-noto-sans)"],
        mono: ["var(--font-noto-sans-mono)"],
      }
    },
  },
  plugins: [],
};
export default config;
