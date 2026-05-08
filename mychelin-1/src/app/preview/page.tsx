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
            Your family recipes,{" "}
            <span className="font-normal italic text-[#9b9b9b]">
              finally written down.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[#6b6b6b]">
            Mychelin is a free app that captures your parents&apos; and
            grandparents&apos; recipes as you cook together over the phone. The
            AI transcribes across dialects, asks the questions you forget, and
            saves every story — so you can actually cook like home.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-full bg-[#1a1a1a] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#333]"
            >
              Start capturing recipes
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
              Learning their cooking shouldn&apos;t feel like a language exam.
            </h2>
            <p className="mt-6 leading-relaxed text-[#6b6b6b]">
              Most of us try to learn our parents&apos; recipes over a phone
              call. They explain in Hokkien or Cantonese. You nod along,
              scribble notes, and hope you got it right. Then you hang up and
              realise you never asked how much soy sauce, whether the ginger
              gets pounded or sliced, or why this dish is only cooked during
              Lunar New Year.
            </p>
            <p className="mt-4 leading-relaxed text-[#6b6b6b]">
              You&apos;ve already done the hard part — getting them to talk.
              The rest should be easy.
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
            Three steps from phone call to dinner plate.
          </h2>
          <p className="mt-3 text-[#6b6b6b]">
            Mychelin is designed to be as simple as the voice memo you&apos;re
            using now. No setup headaches, no learning curve.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Start the conversation",
              body: "Call your parents or grandparents and cook together. Open Mychelin and hit record. The AI listens and transcribes everything — Hokkien, Cantonese, Mandarin, English, or a mix — and structures it into a real recipe as you talk.",
            },
            {
              step: "02",
              title: "Let the AI fill the gaps",
              body: "The AI asks the questions you don't know to ask: exact measurements, substitution options, and the stories behind each dish. Every pinch of salt and every family memory is captured — not lost to translation.",
            },
            {
              step: "03",
              title: "Cook, plan, and shop",
              body: "Your saved recipes become a living cookbook. Plan your week, get suggestions based on what you already have, randomise the menu when you can't decide, and generate grocery lists with calendar reminders that factor in prep and cook time.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-[#e8e8e3] bg-white px-6 py-8"
            >
              <span className="text-xs font-semibold tracking-widest text-[#d97706]">
                {item.step}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-[#1a1a1a]">
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
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="text-center">
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Everything you need to cook like home.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "AI Conversation Capture",
              subtitle: "Transcribes as they speak",
              body: "Voice or text across dialects — Hokkien, Cantonese, Mandarin, English, and more. The AI structures the conversation into a real recipe while you talk.",
            },
            {
              title: "Smart Clarifying Prompts",
              subtitle: "Asks what you'd forget",
              body: "Exact quantities, substitution options, and technique details. No more guessing what 'a little while' or 'agak-agak' means.",
            },
            {
              title: "Heritage & Story Tracking",
              subtitle: "The why behind every dish",
              body: "Save the origin, meaning, and memories behind every recipe. Who taught it, when it's served, and why it matters to your family.",
            },
            {
              title: "Meal Planner & Calendar",
              subtitle: "Your week, planned",
              body: "Drag recipes into days. Calendar integration reserves cooking time slots that factor in both prep and cook time.",
            },
            {
              title: "Ingredient Suggestions & Randomiser",
              subtitle: "Use what you have",
              body: "Discover recipes based on what's already in your fridge, or randomise the weekly menu to beat decision fatigue.",
            },
            {
              title: "Auto Shopping Lists",
              subtitle: "Never forget the belacan",
              body: "Generate a grocery list automatically from any meal plan. Check items off as you shop.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[#e8e8e3] bg-white px-6 py-7 transition hover:border-[#d4d4cf]"
            >
              <h3 className="text-base font-semibold text-[#1a1a1a]">
                {f.title}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-[#d97706]">
                {f.subtitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#6b6b6b]">
                {f.body}
              </p>
            </div>
          ))}
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
            We built Mychelin because we believe family recipes deserve better
            than a half-filled notebook. No surprise fees — just everything you
            need, free.
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
            Stop guessing. Start cooking.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[#9b9b9b]">
            Join Mychelin and be among the first to capture your family recipes
            the right way — before the stories fade.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#f0f0eb]"
            >
              Start capturing recipes
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
