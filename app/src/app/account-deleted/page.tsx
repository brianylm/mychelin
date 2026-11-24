import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account deleted · Mychelin",
  robots: { index: false },
};

// Where Profile → "Delete my account" lands after a successful deletion.
export default function AccountDeletedPage() {
  return (
    <main className="min-h-screen bg-ui-bg px-6 py-12 text-ui-text">
      <article className="mx-auto max-w-2xl space-y-4 text-[15px] leading-7">
        <h1 className="brand-serif text-3xl">Your account has been deleted</h1>
        <p>
          Your account, recipes, photos and voice recordings have been removed from Mychelin.
          Backups that may still hold copies expire on their own. Thank you for cooking with us.
        </p>
        <Link href="/" className="text-sm font-medium text-ui-accent hover:underline">
          Back to Mychelin
        </Link>
      </article>
    </main>
  );
}
