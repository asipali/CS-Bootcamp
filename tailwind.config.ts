import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        vault: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          900: "#14532d",
          950: "#052e16",
        },
        cyber: {
          dark: "#0b0f19",
          card: "#111827",
          border: "#1f2937",
          cyan: "#06b6d4",
          blue: "#3b82f6",
        }
      },
    },
  },
  plugins: [],
};
export default config;
