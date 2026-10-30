import type { Metadata } from "next";
import Link from "next/link";
import { COPYRIGHT_AGENT } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Copyright and takedown requests · Mychelin",
  description: "How to report content on Mychelin that infringes your copyright.",
};

export default function CopyrightPage() {
  const agent = COPYRIGHT_AGENT;

  return (
    <main className="min-h-screen bg-surface px-6 py-12 text-ui-text">
      <article className="mx-auto max-w-2xl space-y-6 text-[15px] leading-7 text-stone-700">
        <Link href="/" className="text-sm font-medium text-ui-accent hover:underline">
          ← Mychelin
        </Link>
        <h1 className="brand-serif text-3xl text-ui-text">Copyright and takedown requests</h1>
        <p>
          Mychelin users can save and share recipes, photos and recordings. If you believe content
          on Mychelin infringes your copyright, send a notice to our designated agent. We respond
          under the US Digital Millennium Copyright Act (17 U.S.C. § 512) and Singapore&apos;s
          Copyright Act 2021.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ui-text">Designated agent</h2>
          {agent.name || agent.email || agent.postalAddress || agent.phone ? (
            <address className="not-italic">
              {agent.name && <div>{agent.name}</div>}
              {agent.postalAddress && <div className="whitespace-pre-line">{agent.postalAddress}</div>}
              {agent.phone && <div>{agent.phone}</div>}
              {agent.email && (
                <div>
                  <a href={`mailto:${agent.email}`} className="text-ui-accent underline">
                    {agent.email}
                  </a>
                </div>
              )}
            </address>
          ) : (
            <p>Agent contact details will be published here shortly.</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ui-text">What your notice must include</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Your physical or electronic signature.</li>
            <li>The copyrighted work you say is infringed.</li>
            <li>
              The material you say infringes it, with enough detail for us to find it, such as the
              share link.
            </li>
            <li>Your name, postal address, phone number and email address.</li>
            <li>
              A statement that you believe in good faith that the use is not authorised by the
              copyright owner, its agent or the law.
            </li>
            <li>
              A statement that the information in the notice is accurate and, under penalty of
              perjury, that you are the owner or are authorised to act for the owner.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ui-text">Counter-notices</h2>
          <p>
            If we remove your content and you believe that was a mistake or misidentification, you
            can send a counter-notice to the same agent. It must include your signature, the
            material removed and where it appeared, a statement under penalty of perjury that you
            believe it was removed by mistake or misidentification, and your name, address and
            phone number with consent to the jurisdiction of the relevant court.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ui-text">Repeat infringers</h2>
          <p>We close the accounts of users who repeatedly infringe others&apos; copyright.</p>
        </section>
      </article>
    </main>
  );
}
