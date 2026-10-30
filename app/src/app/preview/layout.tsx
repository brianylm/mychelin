import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mychelin — The taste of home, wherever you are",
  description:
    "Capture family recipes through live conversation help, translated gist, and meal planning for your new life.",
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /preview only redirects to "/". Fonts come from next/font in the root
  // layout (self-hosted at build time), so nothing loads from Google here.
  return children;
}
