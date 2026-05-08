import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Landing Page                                                      */
/* ------------------------------------------------------------------ */

export default function PreviewLandingPage() {
  return (
    <div
      className="min-h-screen bg-[#fafaf8] text-[#1a1a1a]"
      style={{ fontFamily: "'Satoshi', system-ui, sans-serif" }}
    >
      {/* ==================== NAV ==================== */}
      <nav className="sticky top-0 z-50 border-b border-[#e8e8e3]/60 bg-[#fafaf8]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/preview"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <img
              src="/icons/icon-welcome.png"
              alt="Mychelin"
              className="h-7 w-7 rounded-lg object-cover"
            />
            Mychelin
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-[#6b6b6b] transition hover:text-[#1a1a1a] sm:block"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#333]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="mx-auto max-w-5xl px-6 pt-16 sm:pt-24">
        <div className="max-w-3xl">
          <h1
            className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Cook like home,{" "}
            <span className="font-normal italic text-[#9b9b9b]">
              even in your new home.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[#6b6b6b]">
            You just moved out. You want to eat like you did at home — but
            you&apos;ve never had to cook it yourself. Mychelin helps you learn
            your parents&apos; and grandparents&apos; recipes straight from the
            source, even when you don&apos;t speak the same dialect. Then it
            plans your meals, builds your grocery lists, and takes the hassle
            out of actually cooking.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-full bg-[#1a1a1a] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#333]"
            >
              Start cooking like home
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-[#d4d4cf] bg-white px-7 py-3.5 text-sm font-medium text-[#1a1a1a] transition hover:border-[#9b9b9b]"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-[#9b9b9b]">
            Free forever for your first 50 recipes. No credit card required.
          </p>
        </div>
      </section>

      {/* ==================== PROBLEM ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="rounded-3xl border border-[#e8e8e3] bg-white px-8 py-14 sm:px-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              Moving out means missing home cooking. Learning it shouldn&apos;t
              be this hard.
            </h2>
            <p className="mt-6 leading-relaxed text-[#6b6b6b]">
              You call your parents or grandparents for the recipe. They explain
              in Hokkien or Cantonese. You understand enough to nod along, but
              not enough to write it down. They cook by feel —
              &ldquo;agak-agak,&rdquo; &ldquo;a little while&rdquo; — and
              you&apos;re left guessing what that actually means.
            </p>
            <p className="mt-4 leading-relaxed text-[#6b6b6b]">
              Even when you do nail a dish, the weekly grind sets in. What
              should you cook? What do you need to buy? How long will it take?
              It&apos;s easier to order in — and slowly, the taste of home fades.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section
        id="how-it-works"
        className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32"
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
              Cook together over a call or in person. The AI listens and
              transcribes across Hokkien, Cantonese, Mandarin, English — even
              when everyone is speaking a mix. It structures ingredients and
              steps as you talk, and asks the questions you don&apos;t know to
              ask: exact measurements, substitutions, and the stories behind
              every dish.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#6b6b6b]">
              <li className="flex items-start gap-2">
                <span className="text-[#d97706]">✓</span>
                <span>Multi-dialect transcription in real time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d97706]">✓</span>
                <span>Smart clarifying prompts for ingredients &amp; steps</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d97706]">✓</span>
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
                <span className="text-[#d97706]">✓</span>
                <span>Weekly meal planner with calendar sync</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d97706]">✓</span>
                <span>Ingredient-based suggestions &amp; randomiser</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#d97706]">✓</span>
                <span>Auto-generated shopping lists</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ==================== QUOTE ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="rounded-3xl border border-[#e8e8e3] bg-white px-8 py-14 sm:px-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-2xl leading-snug tracking-tight sm:text-3xl"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              &ldquo;How much soy sauce again? Do I pound the ginger or slice
              it?&rdquo;
            </p>
            <p className="mt-6 leading-relaxed text-[#6b6b6b]">
              You&apos;ve stood in your new kitchen, phone on loudspeaker,
              parent walking you through a dish you&apos;ve eaten a hundred
              times. You want to get it right — not just for dinner tonight, but
              so that one day, when you want to pass it on, the recipe and its
              story are still there.
            </p>
            <p className="mt-4 leading-relaxed text-[#6b6b6b]">
              Mychelin is for that moment. The conversation becomes the
              cookbook. The cookbook becomes your routine.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== TRUST ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="rounded-3xl border border-[#e8e8e3] bg-white px-8 py-14 text-center sm:px-14 sm:py-20">
          <h2
            className="text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Free forever. No catch.
          </h2>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-[#6b6b6b]">
            We built Mychelin because moving out is hard enough. Eating like
            home shouldn&apos;t be. No surprise fees — just everything you need,
            free.
          </p>

          <div className="mx-auto mt-10 grid max-w-xl gap-3 text-left">
            {[
              "Unlimited AI conversation capture",
              "Multi-dialect transcription & translation",
              "Smart clarifying prompts for every recipe",
              "Heritage & story tracking",
              "Weekly meal planner with calendar sync",
              "Ingredient-based recipe suggestions",
              "Recipe randomiser for decision fatigue",
              "Auto-generated shopping lists",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="text-[#d97706]">✓</span>
                <span className="text-sm text-[#1a1a1a]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 pb-6 sm:mt-32">
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
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#f0f0eb]"
            >
              Start cooking like home
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#6b6b6b]">
            No credit card required · Free forever
          </p>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#e8e8e3] pt-8 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a]">
            <img
              src="/icons/icon-welcome.png"
              alt="Mychelin"
              className="h-6 w-6 rounded-md object-cover"
            />
            Mychelin
          </div>
          <p className="text-xs text-[#9b9b9b]">
            Preserving family recipes and heritage, one conversation at a time.
          </p>
          <div className="flex gap-6">
            <Link
              href="/login"
              className="text-xs text-[#6b6b6b] transition hover:text-[#1a1a1a]"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="text-xs text-[#6b6b6b] transition hover:text-[#1a1a1a]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
