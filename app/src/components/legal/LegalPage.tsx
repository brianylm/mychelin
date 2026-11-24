import Link from "next/link";
import type { ReactNode } from "react";

// Shared shell for the plain-language legal pages (/privacy, /terms).
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-ui-bg px-6 py-12 text-ui-text">
      <article className="mx-auto max-w-2xl space-y-6 text-[15px] leading-7 text-ui-text">
        <Link href="/" className="text-sm font-medium text-ui-accent hover:underline">
          ← Mychelin
        </Link>
        <h1 className="brand-serif text-3xl text-ui-text">{title}</h1>
        <p className="text-sm text-ui-muted">Last updated {updated}</p>
        {children}
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ui-text">{title}</h2>
      {children}
    </section>
  );
}
