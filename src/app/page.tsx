import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section
        className="relative min-h-[88vh] md:min-h-[92vh] flex items-center justify-center text-center overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.25)),
            radial-gradient(ellipse at 20% 80%, rgba(194,113,79,0.35) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(232,185,163,0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(245,221,210,0.2) 0%, transparent 70%),
            linear-gradient(135deg, #f5e6d3 0%, #ecd5c3 35%, #d4a98a 65%, #c2714f 100%)
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-20">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight drop-shadow-lg">
            Cook like home, even in your new home.
          </h1>
          <p className="text-lg md:text-2xl text-white/85 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow">
            Your family&apos;s recipes live in conversations, memories, and half-explained instructions.
            Mychelin captures them the way they&apos;re actually shared — then helps you cook them, week after week.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-purple-700 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-purple-600/20"
            >
              <Sparkles className="w-5 h-5" />
              Start for free
            </Link>
            <a
              href="#capture"
              className="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white border border-white/30 px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/30 hover:scale-[1.02] transition-all duration-200"
            >
              How it works
            </a>
          </div>
          <p className="text-sm text-white/60 drop-shadow">
            Free for your first 50 recipes. No credit card required.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-stone-50 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-4">
            The Problem
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-6 leading-tight tracking-tight">
            The recipes you grew up with are closer than you think. And more at risk.
          </h2>
          <div className="prose prose-stone prose-lg max-w-none text-stone-600 leading-relaxed space-y-4">
            <p>
              You call home for the recipe. They explain it — partly in dialect, partly assuming you
              already know the basics. Quantities are approximate. A few steps get skipped because{" "}
              <em>&ldquo;you&apos;d know.&rdquo;</em> You hang up with half a recipe and a lot of goodwill.
            </p>
            <p>
              Even when you do get it right, the next problem starts: what do you cook this week?
              What do you need to buy? How do you make this a habit rather than a once-a-year thing?
            </p>
            <p className="font-medium text-stone-800">
              That&apos;s the gap Mychelin was built for.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works — Capture */}
      <section id="capture" className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-4">
            Capture
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight tracking-tight">
            Get the recipe out of their head and into yours.
          </h2>
          <p className="text-xl text-stone-500 mb-12 max-w-2xl leading-relaxed">
            Family recipes are passed down in conversation — over the phone, at the dinner table,
            mid-cook. Mychelin turns that conversation into a structured recipe, however it happens.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200 hover:shadow-xl transition-shadow">
              <div className="aspect-[16/10] bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                <span className="text-purple-300 text-sm font-medium">Screenshot</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  Have the conversation
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Record it, type it, paste it from WhatsApp, or drop in a URL. Mychelin transcribes
                  across dialects — Cantonese, Hokkien, Mandarin, English, and the messy in-between —
                  and pulls out the ingredients, quantities, and steps automatically.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200 hover:shadow-xl transition-shadow">
              <div className="aspect-[16/10] bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center">
                <span className="text-amber-300 text-sm font-medium">Screenshot</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  Fill in what got left out
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Home cooks don&apos;t always explain the full picture. They assume you know what
                  &ldquo;a bit of dark soy&rdquo; means, or that you&apos;d figure out the heat.
                  Mychelin&apos;s agak-agak mode lets you store recipes the way they were actually
                  given to you — approximate where approximate is honest, precise where
                  you&apos;ve figured it out.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200 hover:shadow-xl transition-shadow">
              <div className="aspect-[16/10] bg-gradient-to-br from-terracotta-50 to-terracotta-100 flex items-center justify-center">
                <span className="text-terracotta-300 text-sm font-medium">Screenshot</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  Keep the story, not just the steps
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Attach the memory behind the dish. Where your grandmother learned it. The occasion
                  it was made for. Over time, Mychelin surfaces the patterns across your whole
                  collection — the principles that define how someone cooks, even for dishes they
                  never got around to teaching you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — Cook */}
      <section className="bg-stone-50 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-4">
            Cook
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight tracking-tight">
            Turn a recipe collection into an actual cooking habit.
          </h2>
          <p className="text-xl text-stone-500 mb-12 max-w-2xl leading-relaxed">
            Having the recipes is the easy part. Mychelin gives you the structure to cook them
            regularly — without the weekly mental load.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200 hover:shadow-xl transition-shadow">
              <div className="aspect-[16/10] bg-gradient-to-br from-sky-50 to-sky-100 flex items-center justify-center">
                <span className="text-sky-300 text-sm font-medium">Screenshot</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  Plan ahead
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Map out your meals for the week or month. Breakfast, lunch, dinner — whatever you
                  actually need. See your whole plan at a glance and adjust as life changes.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200 hover:shadow-xl transition-shadow">
              <div className="aspect-[16/10] bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                <span className="text-green-300 text-sm font-medium">Screenshot</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  Know exactly what to buy
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Mychelin builds your shopping list automatically from your meal plan, scaled to
                  your household size, and deducted against what&apos;s already in your fridge. No
                  overbuying. No last-minute runs.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200 hover:shadow-xl transition-shadow">
              <div className="aspect-[16/10] bg-gradient-to-br from-rose-50 to-rose-100 flex items-center justify-center">
                <span className="text-rose-300 text-sm font-medium">Screenshot</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  Cook for however many you need
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Every recipe scales up or down instantly. Cooking for one tonight, four on Sunday —
                  the ingredients adjust with you.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-stone-200 hover:shadow-xl transition-shadow">
              <div className="aspect-[16/10] bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center">
                <span className="text-violet-300 text-sm font-medium">Screenshot</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  Decide what to cook when you can&apos;t decide
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Surprise Me picks from your own collection when you&apos;re stuck. Filter by a
                  keyword, an ingredient, or just let it choose. No more defaulting to delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Moment */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <blockquote>
            <p className="text-2xl md:text-3xl italic text-stone-500 mb-8 leading-relaxed">
              &ldquo;How much soy sauce?&rdquo; you ask.<br />
              &ldquo;Enough lah,&rdquo; they say.
            </p>
          </blockquote>
          <p className="text-stone-600 leading-relaxed">
            You&apos;ve been in that kitchen a hundred times. You&apos;ve eaten this dish your
            whole life. But standing alone in your own kitchen, you realise you never actually
            learned it — you just watched.
          </p>
          <p className="mt-6 text-stone-700 font-medium leading-relaxed">
            Mychelin is for that moment. The conversation becomes the recipe. The recipe becomes
            the habit. And one day, when your kids ask you how to make it, you&apos;ll have more
            than just a memory to give them.
          </p>
        </div>
      </section>

      {/* Bigger Picture */}
      <section className="bg-stone-50 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-4">
            The Bigger Picture
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-6 leading-tight tracking-tight">
            Food is one of the most direct threads between generations — and one of the quietest
            things we&apos;re losing.
          </h2>
          <p className="text-xl text-stone-500 leading-relaxed mb-8">
            Traditional recipes don&apos;t disappear all at once. They fade, dish by dish, as the
            people who carried them get older and the conversations never quite happen.
          </p>
          <p className="text-xl text-stone-500 leading-relaxed font-medium">
            Mychelin is building the tools — and the archive — to change that. One family at a time.
          </p>
          <p className="mt-8">
            <Link
              href="mailto:hello@mychelin.sg"
              className="text-terracotta hover:text-terracotta-600 text-xl font-medium transition-colors"
            >
              Interested in bringing Mychelin to your community or organisation? Get in touch →
            </Link>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight tracking-tight">
            Start with the one recipe you keep meaning to write down.
          </h2>
          <p className="text-xl text-stone-500 mb-8 leading-relaxed">
            Your family&apos;s recipes are one conversation away. Capture them once, cook them for
            a lifetime.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-purple-700 hover:scale-[1.02] transition-all duration-200"
            >
              <Sparkles className="w-5 h-5" />
              Start for free
            </Link>
            <p className="text-sm text-stone-400">
              No credit card required · Free forever for your first 50 recipes
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
