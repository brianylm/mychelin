import { Libre_Baskerville } from "next/font/google";
import Link from "next/link";

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal"],
  variable: "--font-libre-baskerville",
});

export function LandingPage() {
  return (
    <div
      className={`min-h-screen bg-[#fafaf8] text-[#1a1a1a] ${libreBaskerville.variable}`}
      style={{ fontFamily: "'Satoshi', system-ui, sans-serif" }}
    >
      {/* ==================== NAV ==================== */}
      <header className="fixed top-4 left-1/2 z-50 w-[min(calc(100%-1.5rem),74rem)] -translate-x-1/2 sm:top-5">
        <nav className="relative flex items-center justify-between gap-3 overflow-hidden rounded-full border border-white/45 bg-white/[0.26] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-18px_34px_rgba(255,255,255,0.16),0_18px_55px_rgba(40,26,19,0.14)] backdrop-blur-2xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-white/80 supports-[backdrop-filter]:bg-white/[0.18] sm:px-5 sm:py-3">
          <a href="#" className="relative flex min-w-0 flex-1 items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-white/25">
            <span className="text-lg">🍳</span>
            <span
              className="text-lg font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-libre-baskerville), 'Libre Baskerville', Georgia, serif",
                fontWeight: 700,
                letterSpacing: "-0.015em",
                textTransform: "lowercase",
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
              }}
            >
              <span style={{ color: "#800020" }}>my</span>
              <span style={{ color: "#262626" }}>chelin</span>
            </span>
          </a>
          <a
            href="#how-it-works"
            className="hidden rounded-full px-5 py-2 text-sm font-medium text-stone-700/75 transition-all hover:bg-white/30 hover:text-stone-950 md:block"
          >
            How it works
          </a>
          <div className="flex flex-1 justify-end">
            <Link
              href="/login?mode=signup"
              className="relative shrink-0 rounded-full bg-[#17131f] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_22px_rgba(23,19,31,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#800020] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_28px_rgba(128,0,32,0.24)] sm:px-5"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* ==================== HERO ==================== */}
      <section className="relative flex min-h-[82vh] items-center overflow-hidden sm:min-h-[88vh] lg:min-h-screen">
        {/* Background image */}
        <img
          src="/images/hero-family-table.jpg"
          alt="A family sharing a home-cooked meal together"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center center" }}
        />
        {/* Gradient overlay — stronger on left where text sits */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(250,250,248,0.92) 0%, rgba(250,250,248,0.75) 35%, rgba(250,250,248,0.2) 60%, rgba(250,250,248,0) 100%)",
          }}
        />
        {/* Bottom fade for smooth transition to next section */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(250,250,248,0.6) 0%, rgba(250,250,248,0) 25%)",
          }}
        />

        {/* Text content */}
        <div className="relative z-10 w-full max-w-5xl px-6 py-20 sm:py-24 sm:pl-[8%] lg:pl-[12%]">
          <div className="max-w-xl">
            <h1
              className="text-5xl font-light leading-[1.05] tracking-tight text-[#1a1a1a] sm:text-6xl md:text-7xl"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}
            >
              Cook like home, even in your new home.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[#4a4a4a]">
              Moving out usually means missing home-cooked meals. Mychelin helps
              you bring a taste of home with you.
            </p>
            <div className="mt-8 flex flex-wrap gap-6">
              <Link
                href="/login?mode=signup"
                className="text-sm font-semibold text-stone-900 hover:text-[#800020] transition-colors"
              >
                Try it now →
              </Link>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PROBLEM / STORY ==================== */}
      {/* Archived — see MYCHELIN.md */}

      {/* ==================== HOW IT WORKS ==================== */}
      <section
        id="how-it-works"
        className="mx-auto mt-16 max-w-5xl scroll-mt-28 px-6 sm:mt-20"
      >
        <div className="text-center">
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            How it works
          </h2>
          <p className="mt-3 text-[#6b6b6b]">
            Two ways Mychelin lowers the barrier to eating like home.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Pillar 1: Learn */}
          <div className="rounded-2xl border border-[#e8e8e3] bg-white px-6 py-8">
            <span className="text-xs font-semibold tracking-widest text-[#d97706]">
              LEARN
            </span>
            <h3 className="mt-3 text-xl font-semibold text-[#1a1a1a]">
              Capture recipes straight from the source
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#6b6b6b]">
              Ask how to cook a dish over a chat. The AI listens and transcribes
              across English, Malay, Mandarin, Tamil, and Chinese dialects — even
              when everyone is speaking a mix. It structures ingredients and
              steps as you talk, and asks the questions you don&apos;t know to
              ask: exact measurements, substitutions, and the stories behind
              every dish.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#6b6b6b]">
              <li className="flex items-start gap-2">
                <span className="text-[#9b9b9b]">•</span>
                <span>Multi-dialect transcription in real time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#9b9b9b]">•</span>
                <span>Smart clarifying prompts for ingredients &amp; steps</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#9b9b9b]">•</span>
                <span>Heritage &amp; story tracking for every dish</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2: Cook */}
          <div className="rounded-2xl border border-[#e8e8e3] bg-white px-6 py-8">
            <span className="text-xs font-semibold tracking-widest text-[#d97706]">
              COOK
            </span>
            <h3 className="mt-3 text-xl font-semibold text-[#1a1a1a]">
              Plan, shop, and cook without the hassle
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#6b6b6b]">
              Once your family recipes are saved, Mychelin helps you actually
              cook them. Plan your week, discover dishes based on what you
              already have, randomise the menu when you can&apos;t decide, and
              generate grocery lists. Calendar integration blocks out cooking
              time with prep and cook time factored in.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#6b6b6b]">
              <li className="flex items-start gap-2">
                <span className="text-[#9b9b9b]">•</span>
                <span>Weekly meal planner with calendar sync</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#9b9b9b]">•</span>
                <span>Ingredient-based suggestions &amp; randomiser</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#9b9b9b]">•</span>
                <span>Auto-generated shopping lists</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ==================== TRUST ==================== */}
      {/* Archived — see MYCHELIN.md */}

      {/* ==================== FINAL CTA ==================== */}
      <section id="final" className="mx-auto mt-16 max-w-5xl px-6 pb-6 sm:mt-20">
        <div className="rounded-3xl bg-[#1a1a1a] px-8 py-16 text-center sm:px-14 sm:py-24">
          <h2
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Bring the taste of home with you.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[#9b9b9b]">
            Your family&apos;s recipes are one conversation away. Capture them,
            cook them, and make them part of your new routine.
          </p>
          <div className="mt-8 flex justify-center gap-6">
            <Link
              href="/login?mode=signup"
              className="text-sm font-semibold text-white hover:text-[#800020] transition-colors"
            >
              Start cooking like home →
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#6b6b6b]">
            Free.
          </p>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="mx-auto max-w-5xl px-6 py-10">
        <div className="border-t border-[#e8e8e3] pt-8 text-center">
          <p className="text-xs text-[#9b9b9b]">
            Preserving family recipes and heritage, one conversation at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
// deploy trigger: 15:42:56
// auto-deploy test #3: 16:18
