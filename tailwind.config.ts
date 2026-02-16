import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#e2e8f0",
        surf: "#f8fafc",
        ember: "#f97316",
        pine: "#0f766e",
        maroon: "#7f1d1d"
      },
      boxShadow: {
        panel: "0 16px 40px rgba(2, 6, 23, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
