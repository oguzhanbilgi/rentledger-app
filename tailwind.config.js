/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#312e81",
        },
        surface: {
          light: "#f8fafc",
          dark: "#090d16",
          cardLight: "#ffffff",
          cardDark: "#131b2e",
        },
      },
    },
  },
  plugins: [],
};
