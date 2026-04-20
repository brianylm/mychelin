import { WaitlistForm } from "./WaitlistForm";
import { WaitlistCount } from "./WaitlistCount";

export function Hero() {
  return (
    <section className="px-5 pt-12 pb-16 sm:pt-20 sm:pb-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1
          className="font-semibold tracking-tight text-neutral-900"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Before Ah Ma&apos;s recipes disappear with her.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-600 sm:text-xl">
          Mychelin helps Singapore families capture the dishes, the stories,
          and the exact agak-agak that no cookbook can teach you.
        </p>
        <div className="mx-auto mt-8 max-w-md">
          <WaitlistForm source="hero" />
        </div>
        <div className="mt-4">
          <WaitlistCount />
        </div>
      </div>
    </section>
  );
}
