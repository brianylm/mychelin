import type { Metadata, Viewport } from "next";
import { DM_Sans, Libre_Baskerville, Newsreader } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { PWARegister } from "@/components/PWARegister";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const brandSerif = Newsreader({
  subsets: ["latin"],
  variable: "--font-brand-serif",
  weight: ["400", "500", "600"],
});

const logoSerif = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-logo-serif",
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Mychelin",
  description:
    "Capture family recipes through live conversation help, then plan, shop, and cook like home.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.ico" }],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mychelin",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: "#800020",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${brandSerif.variable} ${logoSerif.variable}`}>
      <body className="min-h-screen bg-surface text-foreground antialiased">
        <AppProviders>
          <PWARegister />
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
