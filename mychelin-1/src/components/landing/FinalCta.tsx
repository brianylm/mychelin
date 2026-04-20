import { WaitlistForm } from "./WaitlistForm";

export function FinalCta() {
  return (
    <section className="px-5 py-24 sm:py-28">
      <div className="mx-auto max-w-xl text-center">
        <p
          className="text-neutral-900"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(2rem, 6vw, 3.25rem)",
            fontStyle: "italic",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Don&apos;t let it disappear.
        </p>
        <div className="mt-8">
          <WaitlistForm source="final" />
        </div>
      </div>
    </section>
  );
}
