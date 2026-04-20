import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { WhatItIs } from "@/components/landing/WhatItIs";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { HeritageProofCard } from "@/components/landing/HeritageProofCard";
import { Testimonial } from "@/components/landing/Testimonial";
import { CreatorBlock } from "@/components/landing/CreatorBlock";
import { FinalCta } from "@/components/landing/FinalCta";
import { SiteFooter } from "@/components/landing/SiteFooter";

export const metadata: Metadata = {
  title: "Mychelin — Before Ah Ma's recipes disappear with her",
  description:
    "Mychelin helps Singapore families capture the dishes, the stories, and the exact agak-agak that no cookbook can teach you.",
  openGraph: {
    title: "Mychelin — Before Ah Ma's recipes disappear with her",
    description:
      "A recipe app built for Singapore families — to capture, store, and cook the dishes that only your family makes.",
    locale: "en_SG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mychelin — Before Ah Ma's recipes disappear with her",
    description:
      "A recipe app built for Singapore families — to capture, store, and cook the dishes that only your family makes.",
  },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <Hero />
      <ProblemSection />
      <WhatItIs />
      <HowItWorks />
      <HeritageProofCard />
      <Testimonial />
      <CreatorBlock />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}
