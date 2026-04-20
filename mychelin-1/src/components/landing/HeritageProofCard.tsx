const ingredients = [
  { name: "minced pork", quantity: "about half a kati", approximate: true },
  {
    name: "beancurd skin",
    quantity: "2 sheets",
    note: "the brittle kind, not the soft",
  },
  {
    name: "five-spice powder",
    quantity: "agak-agak, a few good shakes",
    approximate: true,
  },
  { name: "water chestnuts", quantity: "5, chopped fine" },
  { name: "light soy sauce", quantity: "2 tbsp" },
  {
    name: "white pepper",
    quantity: "to taste, more than you think",
    approximate: true,
  },
];

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`h-4 w-4 ${filled ? "text-amber-500" : "text-neutral-200"}`}
      fill="currentColor"
    >
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.3 5.9 20.5l1.4-6.8L2.2 9l6.9-.7L12 2z" />
    </svg>
  );
}

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= value} />
        ))}
      </span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="text-sm text-neutral-800">{value}</div>
    </div>
  );
}

export function HeritageProofCard() {
  return (
    <section className="px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-center text-sm font-medium uppercase tracking-widest text-amber-700">
          What a Mychelin recipe looks like
        </p>
        <h2
          className="mb-10 text-center text-neutral-900"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          Not an ingredient list. A family record.
        </h2>

        <article className="overflow-hidden rounded-3xl border border-amber-200/70 bg-white shadow-sm">
          {/* Card header */}
          <div className="border-b border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white px-6 pt-6 pb-5 sm:px-8">
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-amber-800">
              Family recipe
            </span>
            <h3
              className="mt-3 text-neutral-900"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Ah Ma&apos;s Lor Bak
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Teochew five-spice pork rolls · Serves 6
            </p>
          </div>

          {/* Heritage fields */}
          <div className="grid gap-4 border-b border-neutral-100 px-6 py-5 sm:grid-cols-3 sm:px-8">
            <Field label="Dialect" value="Teochew" />
            <Field label="From" value="Ah Ma (paternal grandmother)" />
            <Field label="Origin" value="Geylang Serai" />
            <Field label="Generation" value="Grandparent" />
            <Field label="Occasion" value="Chinese New Year reunion" />
          </div>

          {/* Body: ingredients + story */}
          <div className="grid gap-8 px-6 py-6 sm:px-8 md:grid-cols-2">
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Ingredients
              </h4>
              <ul className="space-y-2 text-sm text-neutral-800">
                {ingredients.map((ing) => (
                  <li
                    key={ing.name}
                    className="flex items-baseline justify-between gap-3 border-b border-dashed border-neutral-200 pb-1.5 last:border-0"
                  >
                    <span className="font-medium">{ing.name}</span>
                    <span
                      className={`text-right text-[13px] ${
                        ing.approximate
                          ? "italic text-amber-700"
                          : "text-neutral-500"
                      }`}
                    >
                      {ing.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              {ingredients.find((i) => i.note) && (
                <p className="mt-2 text-xs italic text-neutral-500">
                  beancurd skin — the brittle kind, not the soft.
                </p>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  The story
                </h4>
                <blockquote
                  className="border-l-2 border-amber-400 pl-4 text-neutral-700"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  <p className="italic leading-relaxed">
                    &ldquo;Ah Ma never measured the five-spice. She&apos;d sniff
                    the jar and nod. I&apos;ve been cooking this for eight years
                    trying to get her nod right.&rdquo;
                  </p>
                </blockquote>
              </div>

              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Ratings
                </h4>
                <div className="space-y-2 rounded-xl bg-neutral-50 px-4 py-3">
                  <Rating label="Authenticity" value={5} />
                  <Rating label="Taste" value={5} />
                  <Rating label="Nostalgia" value={5} />
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
