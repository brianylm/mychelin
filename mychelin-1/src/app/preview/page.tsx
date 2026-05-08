import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  App Mockup Components (pure CSS, no external images)              */
/* ------------------------------------------------------------------ */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px]">
      <div className="rounded-[2.5rem] border-4 border-[#e8e8e3] bg-[#1a1a1a] p-3 shadow-2xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-white">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-[#1a1a1a]" />
          {children}
          {/* Home indicator */}
          <div className="absolute bottom-1 left-1/2 z-10 h-1 w-24 -translate-x-1/2 rounded-full bg-neutral-900/20" />
        </div>
      </div>
    </div>
  );
}

function MockupConversation() {
  return (
    <div className="flex h-[640px] flex-col bg-neutral-50 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎙️</span>
          <div>
            <p className="text-sm font-semibold text-neutral-900">Heritage capture</p>
            <p className="text-[11px] text-neutral-500">Recording — speak naturally</p>
          </div>
        </div>
        <button className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
          <span className="text-lg leading-none">×</span>
        </button>
      </div>

      {/* Chat */}
      <div className="flex-1 space-y-4 overflow-hidden px-4 py-4">
        {/* Left bubble */}
        <div className="flex w-full justify-start">
          <div className="max-w-[80%]">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-500">Me</span>
              <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-mono uppercase text-neutral-600">
                auto
              </span>
            </div>
            <div className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-900 shadow-sm">
              How much soy sauce for the chicken rice?
            </div>
            <span className="mt-1 block text-right text-[10px] text-neutral-400">10:02</span>
          </div>
        </div>

        {/* Right bubble */}
        <div className="flex w-full justify-end">
          <div className="max-w-[80%]">
            <div className="mb-1 flex items-center justify-end gap-2">
              <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-mono uppercase text-amber-700">
                auto
              </span>
              <span className="text-xs font-medium text-amber-700">Mum</span>
            </div>
            <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900 shadow-sm">
              Two tablespoons light, one dark. Don&apos;t forget the pandan!
            </div>
            <span className="mt-1 block text-right text-[10px] text-amber-600">10:02</span>
          </div>
        </div>

        {/* Left bubble */}
        <div className="flex w-full justify-start">
          <div className="max-w-[80%]">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-500">Me</span>
              <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-mono uppercase text-neutral-600">
                auto
              </span>
            </div>
            <div className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-900 shadow-sm">
              And the ginger? Do I pound or slice?
            </div>
            <span className="mt-1 block text-right text-[10px] text-neutral-400">10:03</span>
          </div>
        </div>

        {/* Right bubble */}
        <div className="flex w-full justify-end">
          <div className="max-w-[80%]">
            <div className="mb-1 flex items-center justify-end gap-2">
              <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-mono uppercase text-amber-700">
                auto
              </span>
              <span className="text-xs font-medium text-amber-700">Mum</span>
            </div>
            <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900 shadow-sm">
              Slice thin, then pound half. Makes the paste smoother.
            </div>
            <span className="mt-1 block text-right text-[10px] text-amber-600">10:03</span>
          </div>
        </div>

        {/* Transcribing indicator */}
        <div className="flex justify-center py-2">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            Transcribing the last few seconds…
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-neutral-200 bg-white px-4 py-4">
        <div className="flex items-center justify-center gap-3">
          <button className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Start conversation
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-neutral-500">
          The AI auto-detects the language — including Cantonese, Hokkien, Mandarin, and English.
        </p>
      </div>
    </div>
  );
}

function MockupRecipeCard() {
  return (
    <div className="w-[260px] rounded-2xl border border-[#e8e8e3] bg-white p-4 shadow-sm">
      <div className="mb-3 h-32 w-full rounded-xl bg-gradient-to-br from-amber-100 to-orange-50" />
      <h4 className="text-base font-semibold text-[#1a1a1a]">Hainanese Chicken Rice</h4>
      <p className="mt-1 text-xs text-[#9b9b9b]">From Mum • 45 mins</p>
      <div className="mt-3 flex gap-2">
        <span className="rounded-full bg-[#fafaf8] px-2.5 py-1 text-xs text-[#6b6b6b]">4 servings</span>
        <span className="rounded-full bg-[#fafaf8] px-2.5 py-1 text-xs text-[#6b6b6b]">Medium</span>
      </div>
    </div>
  );
}

function MockupMealPlan() {
  return (
    <div className="w-[260px] rounded-2xl border border-[#e8e8e3] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#1a1a1a]">This week</h4>
        <span className="text-xs text-[#9b9b9b]">May 5–11</span>
      </div>
      <div className="space-y-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
          <div key={day} className="flex items-center gap-3">
            <span className="w-8 text-xs font-medium text-[#9b9b9b]">{day}</span>
            <div className={`flex-1 rounded-lg px-3 py-2 text-xs ${i === 1 ? "bg-[#d97706] text-white" : "bg-[#fafaf8] text-[#1a1a1a]"}`}>
              {i === 0 && "Chicken Rice"}
              {i === 1 && "Mee Goreng"}
              {i === 2 && "Laksa"}
              {i === 3 && "Leftovers"}
              {i === 4 && "Fish Curry"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="max-w-xl">
            <h1
              className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              The taste of home,{" "}
              <span className="font-normal italic text-[#9b9b9b]">wherever you are.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[#6b6b6b]">
              You just moved out. Mum&apos;s chicken rice, Dad&apos;s mee goreng,
              Grandma&apos;s dumplings — they&apos;re all just a conversation away.
              Capture your family&apos;s recipes as you cook together, and build a
              system that keeps you fed in your new life.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="rounded-full bg-[#1a1a1a] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#333]"
              >
                Start for free
              </Link>
              <a
                href="#how-it-works"
                className="rounded-full border border-[#d4d4cf] bg-white px-7 py-3.5 text-sm font-medium text-[#1a1a1a] transition hover:border-[#9b9b9b]"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-xs text-[#9b9b9b]">
              No credit card required. Free forever for your first 50 recipes.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <PhoneFrame>
              <MockupConversation />
            </PhoneFrame>
          </div>
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
              &ldquo;How much soy sauce again? Do I pound the ginger or slice it?&rdquo;
            </p>
            <p className="mt-6 leading-relaxed text-[#6b6b6b]">
              We&apos;ve all been there. Standing in a new kitchen, phone on loudspeaker,
              parents walking us through a dish we&apos;ve eaten a hundred times but
              never truly learned. The fear isn&apos;t just that dinner might flop —
              it&apos;s that one day, when we finally want to pass it on, the recipe
              will have faded.
            </p>
            <p className="mt-4 leading-relaxed text-[#6b6b6b]">
              Mychelin is for that moment. The conversation becomes the cookbook.
              The cookbook becomes your routine.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="text-center">
          <h2
            className="text-3xl tracking-tight sm:text-4xl"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            How it works
          </h2>
          <p className="mt-3 text-[#6b6b6b]">
            Three simple steps from phone call to dinner plate.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Talk & Capture",
              body: "Call your parents. Ask them how to cook the dish. Our AI listens and turns the conversation into a structured recipe — ingredients, steps, and all those little tips they always forget to write down.",
            },
            {
              step: "02",
              title: "Build Your Library",
              body: "Every recipe is saved with its story. Who taught it to you. When you first nailed it. The substitutions you figured out. It becomes more than a cookbook — it becomes a living history.",
            },
            {
              step: "03",
              title: "Plan & Cook",
              body: "Turn recipes into weekly meal plans. Generate shopping lists. Scale servings up or down. Walk through step-by-step instructions in the kitchen. Build a system that actually fits your new life.",
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
            Everything you need to cook like home
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "AI Conversation Capture",
              body: "Voice or text — just talk through the recipe naturally. Our AI extracts ingredients, instructions, and tips in real time.",
            },
            {
              title: "Recipe Books",
              body: "Organise dishes by family member, cuisine, or occasion. Create shared books that your siblings can contribute to.",
            },
            {
              title: "Meal Planner",
              body: "Plan your week in minutes. Drag recipes into days, reschedule with a tap, and never wonder what's for dinner again.",
            },
            {
              title: "Shopping Lists",
              body: "Generate a shopping list from any meal plan. Check items off as you shop. Share the list with your flatmates.",
            },
            {
              title: "Version History",
              body: "Iterated on Mum's recipe and made it better? Every change is tracked. Roll back anytime, or fork a new version.",
            },
            {
              title: "Cultural Context",
              body: "Save the stories behind the dishes. The origin, the meaning, the memories. So the next generation knows why it matters.",
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

      {/* ==================== VISUALS ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="rounded-3xl border border-[#e8e8e3] bg-white px-8 py-14 sm:px-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2
                className="text-3xl tracking-tight sm:text-4xl"
                style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                From phone call to meal plan{" "}
                <span className="italic text-[#9b9b9b]">in minutes.</span>
              </h2>
              <p className="mt-5 leading-relaxed text-[#6b6b6b]">
                The conversation with your parents becomes a recipe. The recipe
                becomes part of your weekly plan. The plan becomes a shopping list.
                And before you know it, you&apos;re eating like home again.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="rounded-full bg-[#1a1a1a] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#333]"
                >
                  Start cooking
                </Link>
              </div>
            </div>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
              <MockupRecipeCard />
              <MockupMealPlan />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="mx-auto mt-24 max-w-5xl px-6 pb-6 sm:mt-32">
        <div className="rounded-3xl bg-[#1a1a1a] px-8 py-16 text-center sm:px-14 sm:py-24">
          <h2
            className="text-3xl text-white tracking-tight sm:text-4xl"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Don&apos;t let the recipes fade.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[#9b9b9b]">
            Start building your family cookbook today. The first 50 recipes are
            free — forever. No credit card required.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#f0f0eb]"
            >
              Start for free
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#6b6b6b]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#9b9b9b] underline hover:text-white">
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
            Preserving Singapore&apos;s food heritage, one conversation at a time.
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
