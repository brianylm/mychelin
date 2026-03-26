import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { PWARegister } from "@/components/PWARegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Mychelin",
  description:
    "Preserving Singapore's food heritage through family recipes, stories, and cultural traditions.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.ico" }],
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
  maximumScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: "#d97706",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface text-foreground antialiased">
        <AppProviders>
          <PWARegister />
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
