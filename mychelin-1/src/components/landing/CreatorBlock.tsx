export function CreatorBlock() {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white px-6 py-6 text-sm text-neutral-600">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
          For Singapore food creators
        </p>
        <ul className="space-y-2 leading-relaxed">
          <li>— Share your heritage recipes with your following, story intact.</li>
          <li>— Let fans save them properly — with the voice note, not just a screenshot.</li>
          <li>
            —{" "}
            <a
              href="mailto:hello@mychelin.sg?subject=Creator%20partnership"
              className="font-medium text-amber-700 underline-offset-2 hover:underline"
            >
              Get in touch
            </a>{" "}
            if you&apos;re a Singapore food creator.
          </li>
        </ul>
      </div>
    </section>
  );
}
