import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { LEGAL_UPDATED, MINIMUM_AGE, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of use · Mychelin",
  description: "The simple rules for using Mychelin during beta.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated={LEGAL_UPDATED}>
      <p>
        These are the simple rules for using Mychelin. By creating an account or using the app you
        agree to them and to our{" "}
        <Link href="/privacy" className="text-ui-accent underline">
          privacy notice
        </Link>
        .
      </p>

      <LegalSection title="Beta and price">
        <p>
          Mychelin is in beta and free to use for now. Things may change, break or be removed, and
          we may add paid features later. We will tell you before charging for anything you already
          use. The app has no export or backup feature yet, so keep your own copies of recipes you
          cannot lose.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You must be {MINIMUM_AGE} or older. Give accurate details and keep your password safe.
          You are responsible for what happens under your account. Tell us if you think someone
          else has access to it.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          Your recipes, stories, photos and recordings stay yours. You give us permission to store,
          process and show them as needed to run Mychelin for you and for the people you choose to
          share them with, including sending them to the AI services described in the privacy
          notice when you use those features. Only add content you have the right to use. If you
          record other people, make sure they agree.
        </p>
      </LegalSection>

      <LegalSection title="Please don&apos;t">
        <ul className="list-disc space-y-2 pl-5">
          <li>Upload anything unlawful, harmful, or that infringes someone else&apos;s rights.</li>
          <li>Try to break, overload, scrape or get into parts of Mychelin or other people&apos;s accounts.</li>
          <li>Use the app to harass others or share private information about them.</li>
        </ul>
        <p>
          To report content that infringes your copyright, see{" "}
          <Link href="/copyright" className="text-ui-accent underline">
            copyright and takedown requests
          </Link>
          . We may remove content or suspend accounts that break these rules.
        </p>
      </LegalSection>

      <LegalSection title="Recipes, AI and food safety">
        <p>
          Recipes, translations and anything made by AI can be wrong. Check ingredients, allergens,
          cooking times and food safety yourself. Mychelin does not give medical or dietary advice.
        </p>
      </LegalSection>

      <LegalSection title="No guarantees">
        <p>
          Mychelin is provided as it is, during beta, without promises that it will always be
          available or error-free. To the extent the law allows, we are not responsible for losses
          from using it or from losing access to it. Nothing here limits rights you have under
          Singapore law that cannot be limited.
        </p>
      </LegalSection>

      <LegalSection title="Ending and changes">
        <p>
          You can stop using Mychelin any time. To close your account and delete your data, use
          Delete my account in Profile; Download my data there gives you a copy first. Deleting is
          permanent, and books you own are deleted for everyone in them. If you need help, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-ui-accent underline">
            {SUPPORT_EMAIL}
          </a>
          . We may change these terms as the beta develops and will update the date above. Singapore
          law applies, and the courts of Singapore can hear disputes.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
