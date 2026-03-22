/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        terracotta: {
          DEFAULT: "#C2714F",
          50: "#FCF3EF",
          100: "#F5DDD2",
          200: "#E8B9A3",
          300: "#D99474",
          400: "#C2714F",
          500: "#A85C3D",
          600: "#8B4A31",
          700: "#6E3A27",
        },
      },
      fontFamily: {
        heading: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
