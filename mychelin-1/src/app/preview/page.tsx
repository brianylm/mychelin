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
            Turn family conversations into recipes{" "}
            <span className="font-normal italic text-[#9b9b9b]">
              — in any dialect.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[#6b6b6b]">
            Mychelin is the only app that joins your phone calls with parents
            and grandparents, transcribes across Hokkien, Cantonese, Mandarin,
            and English, and turns the chaos into a structured recipe — complete
            with ingredients, steps, and the stories behind every dish.
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
              You want their recipes. The language gap won&apos;t let you have
              them.
            </h2>
            <p className="mt-6 leading-relaxed text-[#6b6b6b]">
              Your grandmother explains her laksa in Hokkien. Your mother
              describes her mee goreng in Cantonese. You understand enough to
              nod along, but not enough to write it down accurately. They cook
              by feel — &ldquo;a little while,&rdquo; &ldquo;agak-agak,&rdquo;
              &ldquo;until it smells right&rdquo; — and you don&apos;t know
              which questions to ask to fill in the blanks.
            </p>
            <p className="mt-4 leading-relaxed text-[#6b6b6b]">
              By the time you hang up, half the details are gone. And so is the
              story of why this dish matters.
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
            Three steps from phone call to saved recipe.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Cook together",
              body: "Call your parents or grandparents and cook together. Open Mychelin, hit record, and talk naturally. The AI listens in real time — no matter which language or dialect the conversation flows through.",
            },
            {
              step: "02",
              title: "The AI captures everything",
              body: "As you talk, the AI transcribes, structures ingredients and steps, and asks clarifying questions you'd never think to ask: exact measurements, substitution options, and the stories behind each dish.",
            },
            {
              step: "03",
              title: "Keep the recipe forever",
              body: "Every recipe is saved with its full story — who taught it, when it's served, and why it matters. No more half-remembered phone notes. No more recipes lost to time.",
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

      {/* ==================== WHAT MAKES IT DIFFERENT ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="text-center">
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            What makes Mychelin different
          </h2>
          <p className="mt-3 text-[#6b6b6b]">
            Not just a recipe app. A bridge between generations.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {[
            {
              title: "Cross-dialect transcription",
              subtitle: "They speak Hokkien. You read English.",
              body: "The AI transcribes and structures conversations across Hokkien, Cantonese, Mandarin, Teochew, and English — even when everyone is speaking a different language.",
            },
            {
              title: "Smart clarifying prompts",
              subtitle: "Asks what you'd never think to ask",
              body: "The AI gently interrupts to pin down the specifics: exact quantities, substitution options, and technique details. No more guessing what 'a little while' means.",
            },
            {
              title: "Heritage & story tracking",
              subtitle: "The recipe is just the beginning",
              body: "Every dish is saved with its full context — who taught it, when it's traditionally served, and why it matters to your family. The recipe becomes a living memory.",
            },
            {
              title: "Voice-first capture",
              subtitle: "No typing while your hands are covered in oil",
              body: "Record naturally while you cook together. The AI handles the hard part of turning unstructured conversation into a recipe you can actually follow.",
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

      {/* ==================== LOGISTICS ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="rounded-3xl border border-[#e8e8e3] bg-white px-8 py-14 sm:px-14 sm:py-20">
          <div className="text-center">
            <h2
              className="text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              And once you have the recipes?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[#6b6b6b]">
              Mychelin doesn&apos;t just preserve your family&apos;s cooking —
              it helps you actually cook it.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Meal Planner",
                body: "Plan your week with drag-and-drop simplicity. Calendar integration reserves cooking time slots with prep and cook time factored in.",
              },
              {
                title: "Ingredient Suggestions",
                body: "Discover recipes based on what's already in your fridge. No more buying ingredients you already have.",
              },
              {
                title: "Recipe Randomiser",
                body: "Beat decision fatigue with one-tap randomisation. Let the app pick dinner when you can't decide.",
              },
              {
                title: "Auto Shopping Lists",
                body: "Generate a grocery list automatically from any meal plan. Check items off as you shop.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-[#e8e8e3] bg-[#fafaf8] px-5 py-6"
              >
                <h3 className="text-sm font-semibold text-[#1a1a1a]">
                  {f.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#6b6b6b]">
                  {f.body}
                </p>
              </div>
            ))}
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
            We built Mychelin because family recipes shouldn&apos;t die with the
            generation that cooked them. No surprise fees — just everything you
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
            Your family&apos;s recipes are one conversation away. Capture them
            before the stories fade.
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
