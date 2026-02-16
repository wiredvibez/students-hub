import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brutal: {
          black: "#0A0A0A",
          white: "#FFFDF7",
          red: "#FF0000",
          redDark: "#CC0000",
          grey: "#666666",
          lightGrey: "#E8E4DF",
          paper: "#F5F0EB",
        },
      },
      fontFamily: {
        display: ["Secular One", "sans-serif"],
        body: ["Heebo", "sans-serif"],
      },
      boxShadow: {
        brutal: "4px 4px 0px #0A0A0A",
        "brutal-sm": "2px 2px 0px #0A0A0A",
        "brutal-lg": "6px 6px 0px #0A0A0A",
        "brutal-red": "4px 4px 0px #FF0000",
      },
      borderWidth: {
        "3": "3px",
      },
    },
  },
  plugins: [],
};

export default config;
