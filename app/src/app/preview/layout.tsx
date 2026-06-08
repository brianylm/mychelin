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
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap&v=2"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap&v=2"
        rel="stylesheet"
      />
      <style>{`html { scroll-behavior: smooth; }`}</style>
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
