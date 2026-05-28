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
      className={`min-h-screen bg-white text-[#1A1A1A] ${libreBaskerville.variable}`}
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
              <span style={{ color: "#1A1A1A" }}>chelin</span>
            </span>
          </a>
          <div className="flex flex-1 items-center justify-end gap-1">
            <a
              href="#features"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-stone-700/75 transition-all hover:bg-white/30 hover:text-stone-950 md:block"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-stone-700/75 transition-all hover:bg-white/30 hover:text-stone-950 md:block"
            >
              How it works
            </a>
            <Link
              href="/login?mode=signup"
              className="relative ml-1 shrink-0 rounded-full bg-[#17131f] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_22px_rgba(23,19,31,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#800020] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_28px_rgba(128,0,32,0.24)] sm:px-5"
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
              className="text-5xl font-light leading-[1.05] tracking-tight text-[#1A1A1A] sm:text-6xl md:text-7xl"
              style={{ fontFamily: "var(--font-libre-baskerville), 'Libre Baskerville', Georgia, serif", fontWeight: 700 }}
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
        className="mx-auto mt-16 max-w-6xl scroll-mt-28 px-6 sm:mt-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-[0.22em] text-[#800020]/70">
            HOW IT WORKS
          </p>
          <h2
            className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-libre-baskerville), 'Libre Baskerville', Georgia, serif" }}
          >
            Three steps to cook like home again.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#6b6b6b]">
            Mychelin turns a messy family conversation into something you can save,
            plan around, and actually cook on a weeknight.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Record the family recipe",
              body: "Capture voice, chat notes, URLs, or rough memory. Mychelin handles mixed languages, dialects, and vague agak-agak instructions.",
            },
            {
              step: "02",
              title: "Turn it into a usable recipe",
              body: "AI structures ingredients, method, timing, quantities, substitutions, and the family story — then asks what is missing before it gets lost.",
            },
            {
              step: "03",
              title: "Plan, shop, and cook it",
              body: "Add recipes to a weekly plan, generate a shopping list, and cook from a clean step-by-step view when dinner time arrives.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-[2rem] border border-[#ece8df] bg-white/80 p-6 shadow-[0_18px_60px_rgba(60,43,25,0.06)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#800020]/10 text-sm font-semibold text-[#800020]">
                {item.step}
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#1A1A1A]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#6b6b6b]">
                {item.body}
              </p>
            </div>
          ))}
        </div>

      </section>

      {/* ==================== FEATURES ==================== */}
      <section
        id="features"
        className="mx-auto mt-16 max-w-6xl scroll-mt-28 px-6 sm:mt-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-[0.22em] text-[#800020]/70">
            FEATURES
          </p>
          <h2
            className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-libre-baskerville), 'Libre Baskerville', Georgia, serif" }}
          >
            Everything around the recipe, handled.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#6b6b6b]">
            From the first family conversation to the grocery run, Mychelin keeps the cooking flow simple.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {[
            {
              title: "Voice + chat recipe capture",
              body: "Mychelin sits in your conversations and extracts key data for the recipe. Not sure what to clarify, or don’t speak the language? Mychelin helps with that too.",
              screenTitle: "Recipe capture",
              screenLines: ["Aunty: add enough soy sauce", "Mychelin: how much is enough?", "Saved: 2 tbsp light soy sauce"],
            },
            {
              title: "Meal planning",
              body: "Plan and prepare your meals easily. Streamline the homecook process by randomising your meals, cooking and prepping meals in advance, so you can enjoy the process rather than worry about it.",
              screenTitle: "This week",
              screenLines: ["Mon · Tau yu bak", "Wed · Chicken curry", "Prep ahead: chop aromatics"],
            },
            {
              title: "Shopping lists",
              body: "Stay on top of what you need, and what’s expiring.",
              screenTitle: "Shopping list",
              screenLines: ["✓ Garlic", "□ Coconut milk", "Expiring soon: coriander"],
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="overflow-hidden rounded-[2rem] border border-[#ece8df] bg-[#fffdf8] p-5 shadow-[0_18px_60px_rgba(60,43,25,0.06)]"
            >
              <div className="mx-auto flex h-80 max-w-[13rem] justify-center rounded-[2.25rem] border border-stone-900/10 bg-[#1A1A1A] p-2 shadow-[0_18px_50px_rgba(26,26,26,0.18)]">
                <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] bg-white px-4 py-5">
                  <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-stone-900/15" />
                  <div className="mt-6 rounded-2xl bg-[#800020]/10 px-3 py-2 text-xs font-semibold text-[#800020]">
                    {feature.screenTitle}
                  </div>
                  <div className="mt-4 space-y-3">
                    {feature.screenLines.map((line) => (
                      <div key={line} className="rounded-xl bg-white px-3 py-2 text-xs text-[#4a4a4a] shadow-sm">
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-x-8 bottom-5 h-1 rounded-full bg-stone-900/15" />
                </div>
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-[#1A1A1A]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6b6b6b]">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== TRUST ==================== */}
      {/* Archived — see MYCHELIN.md */}

      {/* ==================== FINAL CTA ==================== */}
      <section id="final" className="mx-auto mt-16 max-w-5xl px-6 pb-6 sm:mt-20">
        <div className="rounded-3xl bg-[#1A1A1A] px-8 py-16 text-center sm:px-14 sm:py-24">
          <h2
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: "var(--font-libre-baskerville), 'Libre Baskerville', Georgia, serif" }}
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
