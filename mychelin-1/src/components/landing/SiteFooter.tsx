export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/60 px-5 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-xs text-neutral-500 sm:flex-row sm:justify-between">
        <p>
          <span style={{ fontFamily: "var(--font-serif)" }}>Mychelin</span> —
          preserving Singapore family food heritage.
        </p>
        <p>Made with care in Singapore.</p>
      </div>
    </footer>
  );
}
