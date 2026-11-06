import localFont from "next/font/local";

export const dmSans = localFont({
  src: "./fonts/dm-sans-latin.woff2",
  variable: "--font-dm-sans",
  weight: "400 900",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const brandSerif = localFont({
  src: "./fonts/newsreader-latin.woff2",
  variable: "--font-brand-serif",
  weight: "400 600",
  style: "normal",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

export const logoSerif = localFont({
  src: "./fonts/libre-baskerville-700-latin.woff2",
  variable: "--font-logo-serif",
  weight: "700",
  style: "normal",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});
