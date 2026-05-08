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
            Pass down your recipes.{" "}
            <span className="font-normal italic text-[#9b9b9b]">
              Bridge the language gap.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[#6b6b6b]">
            Your grandkids want to learn your cooking — but they don&apos;t speak
            Hokkien, Cantonese, or Teochew the way you do. Mychelin&apos;s AI
            sits in your conversations, transcribes every detail across
            languages, and asks the questions your grandkids forget to ask.
            No recipe is lost in translation.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-full bg-[#1a1a1a] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#333]"
            >
              Start preserving your legacy
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-[#d4d4cf] bg-white px-7 py-3.5 text-sm font-medium text-[#1a1a1a] transition hover:border-[#9b9b9b]"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-[#9b9b9b]">
            Free forever for your first 50 family recipes. No credit card
            required.
          </p>
        </div>
      </section>

      {/* ==================== STORY ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="rounded-3xl border border-[#e8e8e3] bg-white px-8 py-14 sm:px-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-2xl leading-snug tracking-tight sm:text-3xl"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              &ldquo;How do you teach &lsquo;agak-agak&rsquo; to someone who
              grew up measuring in grams?&rdquo;
            </p>
            <p className="mt-6 leading-relaxed text-[#6b6b6b]">
              Your grandkids love your laksa, your bak kut teh, your mee siam.
              But when they ask you how to cook it, something gets lost. They
              don&apos;t understand the dialect. They can&apos;t read your
              handwriting. And they don&apos;t know which questions to ask.
            </p>
            <p className="mt-4 leading-relaxed text-[#6b6b6b]">
              The secret ingredient in every family dish isn&apos;t listed in
              any cookbook — it&apos;s the story. Why you pound the ginger
              instead of slicing it. Why this dish is only cooked during Lunar
              New Year. Why your mother never used a recipe and neither do you.
              Mychelin captures what cookbooks can&apos;t.
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
            className="text-3xl tracking-tight sm:text-4xl"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            How it works
          </h2>
          <p className="mt-3 text-[#6b6b6b]">
            From family conversation to a recipe they can actually cook.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Speak naturally, in any tongue",
              body: "Cook together over a call or in person. The AI listens and transcribes everything — whether you're explaining in Hokkien, Cantonese, Mandarin, or English. Your grandkids follow along in the language they understand best.",
            },
            {
              step: "02",
              title: "Ask the questions they forget",
              body: "The AI gently prompts for specifics: exact measurements, substitution options, and the stories behind each dish. Every pinch of salt and every family memory is preserved — not just the steps, but the why.",
            },
            {
              step: "03",
              title: "From heritage to dinner table",
              body: "Once saved, the app helps your grandkids plan weekly meals, discover recipes based on ingredients they already have, randomise choices to beat decision fatigue, and generate grocery lists with calendar reminders that factor in prep and cook time.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-[#e8e8e3] bg-white px-6 py-8"
            >
              <span className="text-xs font-semibold tracking-widest text-[#d97706]">
                {item.step}
              </span>
              <h3
                className="mt-3 text-xl tracking-tight"
                style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
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
            className="text-3xl tracking-tight sm:text-4xl"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Everything your family needs to keep the tradition alive
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "AI Conversation Capture",
              body: "Voice or text across dialects — Hokkien, Cantonese, Mandarin, English, and more. The AI transcribes and structures the conversation into a real recipe in real time.",
            },
            {
              title: "Smart Clarifying Prompts",
              body: "The AI asks what young cooks don't know to ask: exact quantities, substitution options, and technique details. No more guessing what 'a little while' means.",
            },
            {
              title: "Heritage & Story Tracking",
              body: "Save the origin, meaning, and memories behind every dish. Who taught it to you, when it's traditionally served, and why it matters to your family.",
            },
            {
              title: "Meal Planner & Calendar",
              body: "Plan the week ahead with drag-and-drop simplicity. Calendar integration reserves cooking time slots that factor in both prep and cook time.",
            },
            {
              title: "Ingredient Suggestions & Randomiser",
              body: "Propose recipes based on what's already in the fridge, or randomise the weekly menu to beat decision fatigue. Cooking becomes effortless.",
            },
            {
              title: "Auto Shopping Lists",
              body: "Generate a grocery list automatically from any meal plan. Check items off as you shop. Never forget the belacan again.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[#e8e8e3] bg-white px-6 py-7 transition hover:border-[#d4d4cf]"
            >
              <h3 className="text-base font-semibold text-[#1a1a1a]">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6b6b6b]">
                {f.body}
              </p>
            </div>
          ))}
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
              A recipe is more than ingredients and steps. It is the voice of
              the person who taught it to you.
            </p>
            <p className="mt-6 leading-relaxed text-[#6b6b6b]">
              Mychelin makes sure that voice is never lost — not to time, not
              to distance, and not to the gap between dialects. Your grandkids
              will know how to cook like you. More importantly, they will know
              why it matters.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 pb-6 sm:mt-32">
        <div className="rounded-3xl bg-[#1a1a1a] px-8 py-16 text-center sm:px-14 sm:py-24">
          <h2
            className="text-3xl tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Don&apos;t let the recipes fade.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[#9b9b9b]">
            Start building your family cookbook today. The first 50 recipes
            are free — forever. No credit card required.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#f0f0eb]"
            >
              Start preserving your legacy
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#6b6b6b]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#9b9b9b] underline hover:text-white"
            >
              Log in
            </Link>
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
