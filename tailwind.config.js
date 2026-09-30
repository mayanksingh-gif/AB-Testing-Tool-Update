/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Serif headline font for the admin dashboard (TestFlow revamp) —
      // loaded via next/font/google in app/(admin)/layout.tsx and exposed
      // here as a CSS variable so Tailwind's `font-serif-display` utility
      // can reference it without hardcoding a font stack.
      fontFamily: {
        "serif-display": ["var(--font-serif-display)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
