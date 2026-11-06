"use client";

import { Libre_Baskerville, Newsreader } from "next/font/google";
import Image, { getImageProps } from "next/image";
import Link from "next/link";

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

const features = [
  {
    title: "Live recipe conversation",
    body: "Mychelin sits with you while a parent or grandparent narrates the dish: live transcript, translated gist, and questions to ask before the important details disappear.",
  },
  {
    title: "Meal planning",
    body: "Plan and prepare your meals easily. Streamline the homecook process by randomising your meals, cooking and prepping meals in advance, so you can enjoy the process rather than worry about it.",
  },
  {
    title: "Shopping lists",
    body: "Stay on top of what you need, and what’s expiring.",
  },
];

const howItWorks = [
  {
    title: "Sit in the conversation",
    body: "Record while the recipe is being narrated. Mychelin listens for mixed language, translates the gist, and suggests respectful follow-up questions.",
  },
  {
    title: "Review what was said",
    body: "Keep the original phrasing beside translated instructions, confirm uncertain family terms, and only then extract the recipe structure.",
  },
  {
    title: "Plan, shop, and cook it",
    body: "Add recipes to a weekly plan, generate a shopping list, and cook from a clean step-by-step view when dinner time arrives.",
  },
];

export function LandingPage() {
  return (
    <div
      className={`landing-content min-h-screen bg-ui-surface-raised text-ui-text ${brandSerif.variable} ${logoSerif.variable}`}
      style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
    >
      {/* ==================== NAV ==================== */}
      <header className="fixed top-4 left-1/2 z-50 w-[min(calc(100%-1.5rem),74rem)] -translate-x-1/2 sm:top-5">
        <nav className="relative flex items-center justify-between gap-3 rounded-full bg-ui-surface-raised px-3 py-2 ring-1 ring-ui-border sm:px-5 sm:py-3">
          <a href="#" className="relative flex min-w-0 flex-1 items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-ui-surface-subtle">
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
                fontFamily: "var(--font-logo-serif), 'Libre Baskerville', Georgia, serif",
                fontWeight: 700,
                letterSpacing: "-0.015em",
                textTransform: "lowercase",
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
              }}
            >
              <span style={{ color: "var(--ui-accent)" }}>my</span>
              <span style={{ color: "var(--ui-text)" }}>chelin</span>
            </span>
          </a>
          <div className="flex flex-1 items-center justify-end gap-1">
            <a
              href="#how-it-works"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-ui-text transition hover:bg-ui-surface-subtle hover:text-ui-text md:block"
            >
              How it works
            </a>
            <a
              href="#features"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-ui-text transition hover:bg-ui-surface-subtle hover:text-ui-text md:block"
            >
              Features
            </a>
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-ui-text transition hover:bg-ui-surface-subtle hover:text-ui-text sm:block"
            >
              Log in
            </Link>
            <Link
              href="/login?mode=signup"
              className="relative ml-1 shrink-0 rounded-full bg-ui-action px-4 py-2 text-sm font-semibold text-ui-action-text  transition hover:-translate-y-0.5 hover:bg-ui-accent  sm:px-5"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* ==================== HERO ==================== */}
      <section className="relative flex min-h-[88vh] items-end overflow-hidden bg-ui-bg sm:min-h-[88vh] sm:items-center lg:min-h-screen">
        {/* Background image — art-directed: portrait crop on mobile so the
            browser never upscales a thin slice of the 16:9 original. */}
        {(() => {
          const common = {
            alt: "A family sharing a home-cooked meal together",
            sizes: "100vw",
            quality: 90,
          } as const;
          const {
            props: { srcSet: mobileSrcSet },
          } = getImageProps({
            ...common,
            src: "/images/hero-family-table-mobile.jpg",
            fill: true,
          });
          const {
            props: { srcSet: desktopSrcSet, alt: desktopAlt, ...desktopRest },
          } = getImageProps({
            ...common,
            src: "/images/hero-family-table.jpg",
            fill: true,
            preload: true,
            fetchPriority: "high",
          });
          return (
            <picture className="landing-hero-frame absolute inset-0">
              <source media="(max-width: 639px)" srcSet={mobileSrcSet} />
              <source media="(min-width: 640px)" srcSet={desktopSrcSet} />
              <img
                {...desktopRest}
                alt={desktopAlt}
                className="landing-hero-image absolute inset-0 h-full w-full object-cover"
              />
            </picture>
          );
        })()}
        {/* Mobile readability scrim. Keeps faces visible and reserves
            the strongest wash for the copy area rather than the whole image. */}
        <div className="landing-hero-readable-scrim absolute inset-0 sm:hidden" />
        {/* Desktop overlays were already working; keep them unchanged. */}
        <div className="landing-hero-scrim-side absolute inset-0 hidden sm:block" />
        <div className="landing-hero-scrim-base absolute inset-0 hidden sm:block" />

        {/* Text content */}
        <div className="relative z-10 w-full max-w-5xl px-6 pb-12 pt-[52vh] sm:py-24 sm:pl-[8%] lg:pl-[12%]">
          <div className="max-w-xl">
            <h1
              className="landing-serif text-[2.75rem] leading-[1.02] text-ui-text sm:text-6xl md:text-7xl"
              style={{ fontFamily: "var(--font-brand-serif), 'Newsreader', Georgia, serif", fontWeight: 400 }}
            >
              Cook like home, even in your new home.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ui-text">
              Mychelin helps you capture family recipes as they are spoken,
              translate the gist while you listen, and turn them into meals you
              can plan, shop for, and cook again.
            </p>
            <div className="mt-8 flex flex-wrap gap-6">
              <Link
                href="/login?mode=signup"
                className="-my-3 inline-flex min-h-11 items-center text-sm font-semibold text-ui-text hover:text-ui-accent transition-colors"
              >
                Try it now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PROBLEM / STORY ==================== */}
      {/* Archived — see MYCHELIN.md */}

      {/* ==================== HOW IT WORKS ==================== */}
      <section
        id="how-it-works"
        className="mx-auto mt-16 max-w-6xl scroll-mt-28 px-6 sm:mt-24"
      >
        <div className="max-w-2xl">
          <h2
            className="landing-serif text-4xl leading-[1.05] text-ui-text sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-brand-serif), 'Newsreader', Georgia, serif" }}
          >
            Three steps to cook like home again.
          </h2>
          <p className="mt-5 text-base leading-7 text-ui-muted">
            Mychelin helps you stay inside the family conversation first,
            then turns what was said into something you can save, plan around,
            and cook on a weeknight.
          </p>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
          {howItWorks.map((item) => (
            <div key={item.title}>
              <h3
                className="landing-serif text-2xl leading-[1.08] text-ui-text"
                style={{ fontFamily: "var(--font-brand-serif), 'Newsreader', Georgia, serif" }}
              >
                {item.title}
              </h3>
              <p className="mt-3 text-base leading-7 text-ui-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section
        id="features"
        className="mx-auto mt-20 max-w-6xl scroll-mt-28 px-6 sm:mt-32"
      >
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <h2
            className="landing-serif max-w-xl text-4xl leading-[1.05] text-ui-text sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-brand-serif), 'Newsreader', Georgia, serif" }}
          >
            Everything around the recipe, handled.
          </h2>

          <div className="space-y-10">
            {features.map((feature) => (
              <div key={feature.title}>
                <h3
                  className="landing-serif text-3xl leading-[1.05] text-ui-text"
                  style={{ fontFamily: "var(--font-brand-serif), 'Newsreader', Georgia, serif" }}
                >
                  {feature.title}
                </h3>
                <p className="mt-3 max-w-xl text-base leading-7 text-ui-muted">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TRUST ==================== */}
      {/* Archived — see MYCHELIN.md */}

      {/* ==================== FINAL CTA ==================== */}
      <section id="final" className="mt-20 bg-ui-action py-16 text-ui-action-text sm:mt-28 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <h2
              className="landing-serif max-w-xl text-4xl leading-[1.05] text-ui-action-text sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-brand-serif), 'Newsreader', Georgia, serif" }}
            >
              Bring the taste of home with you.
            </h2>
          </div>

          <div className="flex flex-col justify-end">
            <p className="max-w-2xl text-base leading-7 text-ui-night-muted">
              Start with the next recipe conversation. Mychelin helps you ask
              better questions in the moment, then turns the answers into a dish
              you can cook again.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/login?mode=signup"
                className="rounded-xl bg-ui-highlight px-5 py-3 text-sm font-semibold text-ui-action transition hover:bg-ui-highlight-hover"
              >
                Start cooking like home
              </Link>
              <p className="text-sm text-ui-night-muted">
                Free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10">
        <p className="text-xs text-ui-muted">
          Cook like home, even in your new home.
        </p>
        <Link href="/copyright" className="text-xs text-ui-muted underline-offset-4 hover:underline">
          Copyright and takedowns
        </Link>
      </footer>
    </div>
  );
}
// deploy trigger: 15:42:56
// auto-deploy test #3: 16:18
