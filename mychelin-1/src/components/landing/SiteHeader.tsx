import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200/60 bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <img
              src="/icons/icon-96.png"
              alt=""
              aria-hidden
              className="h-6 w-6 rounded-md"
            />
          </span>
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Mychelin
          </span>
        </Link>
        <Link
          href="/app"
          className="rounded-full px-4 py-2 text-sm font-medium text-neutral-700 transition hover:text-amber-700"
        >
          Log in
        </Link>
      </div>
    </header>
  );
}
