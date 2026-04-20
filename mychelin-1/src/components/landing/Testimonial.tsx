export function Testimonial() {
  return (
    <section className="px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <blockquote>
          <p
            className="text-neutral-800"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
              lineHeight: 1.4,
              fontStyle: "italic",
              letterSpacing: "-0.005em",
            }}
          >
            &ldquo;I kept meaning to write down my mother&apos;s lor bak recipe.
            She passed two years ago. I have her handwriting on a scrap of paper
            but half the ingredients are <em>secukupnya</em>. This is the first
            thing I&apos;ve tried that hasn&apos;t turned her cooking into a
            Western recipe.&rdquo;
          </p>
          <footer className="mt-6 text-sm text-neutral-500">
            — Mdm Lim, Pasir Ris
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
