const scenarios = [
  {
    num: "01",
    title: "Sit with your grandma.",
    body: "Record her telling you how she makes kueh lapis. Mychelin pulls out the ingredients and steps, and keeps her voice attached to the recipe.",
  },
  {
    num: "02",
    title: "Your mum's WhatsApp voice note.",
    body: "Forward it in. The recipe shows up the next morning, ready for you to tweak — with the voice note saved alongside.",
  },
  {
    num: "03",
    title: "Cooked it tonight.",
    body: "Snap the pot, rate how close it was to hers. Note what you'd change. Next time, you're closer.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <ol className="space-y-12 sm:space-y-14">
          {scenarios.map((s) => (
            <li key={s.num} className="grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-8">
              <span
                className="text-amber-700"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "2.25rem",
                  lineHeight: 1,
                  fontStyle: "italic",
                }}
              >
                {s.num}
              </span>
              <div>
                <h3
                  className="text-xl text-neutral-900 sm:text-2xl"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-neutral-600 sm:text-lg">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
