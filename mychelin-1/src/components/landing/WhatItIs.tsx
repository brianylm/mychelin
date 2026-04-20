export function WhatItIs() {
  return (
    <section className="border-y border-amber-100 bg-amber-50/50 px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p
          className="text-neutral-800"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          A home for your family&apos;s recipes — in your mum&apos;s words, your
          grandma&apos;s measurements, and your kitchen.
        </p>
      </div>
    </section>
  );
}
