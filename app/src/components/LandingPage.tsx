"use client";

import { useCallback, useRef, useState } from "react";
import { Libre_Baskerville, Newsreader } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const brandSerif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  variable: "--font-brand-serif",
});

const logoSerif = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  variable: "--font-logo-serif",
});

const featurePages = [
  {
    title: "Live recipe conversation",
    body: "Mychelin sits with you while a parent or grandparent narrates the dish: live transcript, translated gist, and questions to ask before the important details disappear.",
    screenTitle: "Live helper",
    screenLines: [
      "Ah Ma: fry until fragrant",
      "Gist: aromatics first, low heat",
      "Ask: what smell tells me it is ready?",
    ],
  },
  {
    title: "Meal planning",
    body: "Plan and prepare your meals easily. Streamline the homecook process by randomising your meals, cooking and prepping meals in advance, so you can enjoy the process rather than worry about it.",
    screenTitle: "This week",
    screenLines: [
      "Mon · Tau yu bak",
      "Wed · Chicken curry",
      "Prep ahead: chop aromatics",
    ],
  },
  {
    title: "Shopping lists",
    body: "Stay on top of what you need, and what’s expiring.",
    screenTitle: "Shopping list",
    screenLines: ["✓ Garlic", "□ Coconut milk", "Expiring soon: coriander"],
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Sit in the conversation",
    body: "Record while the recipe is being narrated. Mychelin listens for mixed language, translates the gist, and suggests respectful follow-up questions.",
  },
  {
    step: "02",
    title: "Review what was said",
    body: "Keep the original phrasing beside translated instructions, confirm uncertain family terms, and only then extract the recipe structure.",
  },
  {
    step: "03",
    title: "Plan, shop, and cook it",
    body: "Add recipes to a weekly plan, generate a shopping list, and cook from a clean step-by-step view when dinner time arrives.",
  },
];

export function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const activeFeaturePage = featurePages[activeFeature];

  const showFeature = useCallback((index: number) => {
    setActiveFeature((index + featurePages.length) % featurePages.length);
  }, []);

  const showNextFeature = useCallback(() => {
    setActiveFeature((current) => (current + 1) % featurePages.length);
  }, []);

  const showPreviousFeature = useCallback(() => {
    setActiveFeature(
      (current) => (current - 1 + featurePages.length) % featurePages.length
    );
  }, []);

  return (
    <div
      className={`landing-content min-h-screen bg-[#fafaf8] text-[#1A1A1A] ${brandSerif.variable} ${logoSerif.variable}`}
    >
      <header className="fixed left-1/2 top-4 z-50 w-[min(calc(100%-1.5rem),74rem)] -translate-x-1/2 sm:top-5">
        <nav className="relative flex items-center justify-between gap-3 rounded-full bg-[#fffdfb] px-3 py-2 shadow-[0_1px_2px_rgba(40,26,19,0.08)] ring-1 ring-[#e4ddd4] sm:px-5 sm:py-3">
          <a
            href="#"
            className="relative flex min-w-0 flex-1 items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-[#f6f2eb]"
          >
            <Image
              src="/images/mychelin-icon-96.webp"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
            />
            <span
              className="logo-serif text-lg font-bold"
              style={{
                fontFamily:
                  "var(--font-logo-serif), 'Libre Baskerville', Georgia, serif",
                fontWeight: 700,
                letterSpacing: "0",
                textTransform: "lowercase",
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
              }}
            >
              <span className="text-[#800020]">my</span>
              <span className="text-[#1A1A1A]">chelin</span>
            </span>
          </a>
          <div className="flex flex-1 items-center justify-end gap-1">
            <a
              href="#how-it-works"
              className="hidden whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-[#f6f2eb] hover:text-stone-950 md:block"
            >
              How it works
            </a>
            <a
              href="#features"
              className="hidden whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-[#f6f2eb] hover:text-stone-950 md:block"
            >
              Features
            </a>
            <Link
              href="/login"
              className="hidden whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-[#f6f2eb] hover:text-stone-950 sm:block"
            >
              Log in
            </Link>
            <Link
              href="/login?mode=signup"
              className="relative ml-1 shrink-0 whitespace-nowrap rounded-full bg-[#17131f] px-4 py-2 text-sm font-semibold text-[#fffaf4] shadow-[0_1px_2px_rgba(23,19,31,0.18)] transition-[transform,background-color] duration-200 hover:-translate-y-px hover:bg-[#800020] active:translate-y-0 sm:px-5"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative flex min-h-[88svh] items-end overflow-hidden bg-[#fafaf8] sm:items-center lg:min-h-[96svh]">
        <Image
          src="/images/hero-family-table.jpg"
          alt="A family sharing a home-cooked meal together"
          fill
          priority
          sizes="100vw"
          className="landing-hero-image absolute inset-0 h-full w-full object-cover"
        />
        <div className="landing-hero-readable-scrim absolute inset-0 sm:hidden" />
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            background:
              "linear-gradient(90deg, rgba(250,250,248,0.92) 0%, rgba(250,250,248,0.75) 35%, rgba(250,250,248,0.2) 60%, rgba(250,250,248,0) 100%)",
          }}
        />
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            background:
              "linear-gradient(0deg, rgba(250,250,248,0.6) 0%, rgba(250,250,248,0) 25%)",
          }}
        />

        <div className="landing-hero-content relative z-10 w-full max-w-5xl px-6 pb-12 pt-[52svh] sm:py-24 sm:pl-[8%] lg:pl-[12%]">
          <div className="max-w-xl">
            <h1 className="landing-hero-title landing-serif min-w-0 [overflow-wrap:anywhere] text-[2.75rem] leading-[1.02] text-[#1A1A1A] sm:text-6xl md:text-7xl">
              Cook like home, even in your new home.
            </h1>
            <p className="landing-hero-copy mt-6 max-w-[62ch] text-lg leading-relaxed text-[#4a4a4a]">
              Mychelin helps you capture family recipes as they are spoken,
              translate the gist while you listen, and turn them into meals you
              can plan, shop for, and cook again.
            </p>
            <div className="landing-hero-cta mt-8 flex flex-wrap gap-6">
              <Link
                href="/login?mode=signup"
                className="whitespace-nowrap text-sm font-semibold text-stone-900 transition-colors hover:text-[#800020]"
              >
                Try it now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto mt-16 max-w-6xl scroll-mt-28 px-6 sm:mt-24"
      >
        <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5f574f]">
            How it works
          </p>
          <div>
            <h2 className="landing-serif max-w-3xl text-4xl leading-[1.05] text-[#1A1A1A] sm:text-5xl lg:text-6xl">
              Three steps to cook like home again.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#5f574f]">
              Mychelin helps you stay inside the family conversation first,
              then turns what was said into something you can save, plan around,
              and cook on a weeknight.
            </p>
          </div>
        </div>

        <div className="mt-12 border-y border-[#d8d0c6]">
          {howItWorks.map((item) => (
            <article
              key={item.step}
              className="grid gap-3 border-b border-[#e5ded5] py-7 last:border-b-0 sm:grid-cols-[4rem_minmax(0,0.9fr)_minmax(0,1.2fr)] sm:gap-6"
            >
              <p className="text-sm font-semibold tabular-nums text-[#800020]">
                {item.step}
              </p>
              <h3 className="landing-serif text-2xl leading-[1.08] text-[#1A1A1A]">
                {item.title}
              </h3>
              <p className="max-w-[62ch] text-sm leading-6 text-[#5f574f]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="features"
        className="mx-auto mt-20 max-w-6xl scroll-mt-28 px-6 sm:mt-28"
      >
        <div className="grid gap-12 border-t border-[#d8d0c6] pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5f574f]">
              Features
            </p>
            <h2 className="landing-serif mt-6 max-w-xl text-4xl leading-[1.05] text-[#1A1A1A] sm:text-5xl lg:text-6xl">
              Everything around the recipe, handled.
            </h2>
          </div>

          <div
            className="touch-pan-y border-t border-[#d8d0c6] pt-8 lg:border-t-0 lg:pt-0"
            onPointerDown={(event) => {
              swipeStartX.current = event.clientX;
            }}
            onPointerUp={(event) => {
              if (swipeStartX.current === null) return;
              const deltaX = event.clientX - swipeStartX.current;
              swipeStartX.current = null;
              if (Math.abs(deltaX) < 45) return;
              if (deltaX < 0) showNextFeature();
              else showPreviousFeature();
            }}
            onPointerCancel={() => {
              swipeStartX.current = null;
            }}
          >
            <article
              className="border-y border-[#d8d0c6] py-8"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex items-center justify-between gap-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#800020]">
                  0{activeFeature + 1}
                </p>
                <p className="text-xs tabular-nums text-[#5f574f]">
                  {activeFeature + 1} / {featurePages.length}
                </p>
              </div>
              <h3 className="landing-serif mt-5 text-3xl leading-[1.05] text-[#1A1A1A] sm:text-4xl">
                {activeFeaturePage.title}
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#5f574f]">
                {activeFeaturePage.body}
              </p>

              <div className="mt-8 border-l-2 border-[#800020] pl-4 sm:pl-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#800020]">
                  {activeFeaturePage.screenTitle}
                </p>
                <ol className="mt-3 divide-y divide-[#e5ded5] border-y border-[#e5ded5]">
                  {activeFeaturePage.screenLines.map((line, index) => (
                    <li
                      key={line}
                      className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3 text-sm leading-6 text-[#3f3934]"
                    >
                      <span className="tabular-nums text-[#800020]" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </article>

            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={showPreviousFeature}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d8d0c6] bg-[#fffdfb] text-[#1A1A1A] transition-colors hover:border-[#800020] hover:text-[#800020]"
                aria-label="Show previous feature"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="flex items-center justify-center gap-1" role="group" aria-label="Choose feature">
                {featurePages.map((feature, index) => (
                  <button
                    key={feature.title}
                    type="button"
                    onClick={() => showFeature(index)}
                    className="flex h-11 w-8 items-center justify-center"
                    aria-label={`Show ${feature.title}`}
                    aria-current={index === activeFeature ? "true" : undefined}
                  >
                    <span
                      className={`h-2 w-2 rounded-full border transition-colors ${index === activeFeature ? "border-[#800020] bg-[#800020]" : "border-[#9c9187] bg-transparent"}`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={showNextFeature}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d8d0c6] bg-[#fffdfb] text-[#1A1A1A] transition-colors hover:border-[#800020] hover:text-[#800020]"
                aria-label="Show next feature"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="final"
        className="mt-20 bg-[#17131f] px-6 py-16 text-[#fffaf4] sm:mt-28 sm:py-20"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f7c86a]">
              Start your recipe book
            </p>
            <h2 className="landing-serif mt-6 max-w-xl text-4xl leading-[1.05] text-[#fffaf4] sm:text-5xl lg:text-6xl">
              Bring the taste of home with you.
            </h2>
          </div>

          <div className="flex flex-col justify-end border-t border-white/15 pt-8 lg:border-t-0 lg:pt-0">
            <p className="max-w-2xl text-base leading-7 text-white/75">
              Start with the next recipe conversation. Mychelin helps you ask
              better questions in the moment, then turns the answers into a dish
              you can cook again.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/login?mode=signup"
                className="whitespace-nowrap rounded-full bg-[#f7c86a] px-5 py-3 text-sm font-semibold text-[#17131f] transition-colors hover:bg-[#ffd98a]"
              >
                Start cooking like home
              </Link>
              <p className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                Free.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs text-[#6b625c]">
          Cook like home, even in your new home.
        </p>
      </footer>
    </div>
  );
}
