import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { LEGAL_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy notice · Mychelin",
  description: "What Mychelin collects, why, who handles it, and how to reach us about your data.",
};

export default function PrivacyPage() {
  const mail = (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-ui-accent underline">
      {SUPPORT_EMAIL}
    </a>
  );

  return (
    <LegalPage title="Privacy notice" updated={LEGAL_UPDATED}>
      <p>
        Mychelin is a Singapore-based app for keeping and cooking family recipes. It is in beta.
        This page explains what we collect, why, who else handles it, and how to reach us. We
        follow Singapore&apos;s Personal Data Protection Act (PDPA).
      </p>

      <LegalSection title="Who to contact">
        <p>
          Questions, access or correction requests, deletion requests, or complaints about your
          data: email {mail}. This is our data protection contact. We aim to reply within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Your account:</strong> name, email address and a scrambled (hashed) password,
            or your name, email and profile picture if you sign in with Google. Optional cooking
            preferences you choose to set.
          </li>
          <li>
            <strong>What you add:</strong> recipes, stories, family member names and dialect or
            origin notes, photos, voice recordings and the text made from them, meal plans,
            shopping lists, inventory, and feedback you send us.
          </li>
          <li>
            <strong>Sharing:</strong> households, books and share links you create or join, and a
            short activity log inside them.
          </li>
          <li>
            <strong>Optional features:</strong> if you turn on reminders we store your browser&apos;s
            push address. If you connect Google Calendar we store your Google account email and an
            encrypted access token.
          </li>
          <li>
            <strong>Technical and security data:</strong> which features you use (we do not use
            advertising or third-party analytics trackers), and your IP address and email address
            in counters that limit repeated sign-in attempts and other abuse.
          </li>
          <li>
            <strong>Cookies and browser storage:</strong> one sign-in cookie, plus storage in your
            browser for drafts, preferences and dismissed notices.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Why we use it">
        <p>
          To run Mychelin for you: sign you in, store and show your recipes, plan and cook meals,
          send the emails and reminders you ask for, keep the service secure, answer support
          requests, and fix problems and improve the app. We use your information for these
          purposes when you sign up and use the features. We do not sell it.
        </p>
      </LegalSection>

      <LegalSection title="Voice, photos and AI features">
        <p>
          Some features use artificial intelligence. When you use them, the content you give is
          sent to these companies to be processed:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Google (Gemini):</strong> turns your voice recordings into text, helps
            structure recipe text, and restyles recipe photos. We use Google&apos;s free service
            tier. Under Google&apos;s free-tier terms, what you send may be used to improve
            Google&apos;s products and may be read by people reviewing it.
          </li>
          <li>
            <strong>DeepSeek:</strong> helps structure recipe text. DeepSeek is a company based in
            China and may process this text outside Singapore.
          </li>
        </ul>
        <p>
          Please do not record or enter anything private about other people unless they agree. If
          you would rather not use these features, you can use Mychelin without them by typing your
          recipes in.
        </p>
      </LegalSection>

      <LegalSection title="Who else handles your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>Vercel: hosts the app (servers in Tokyo) and stores uploaded photos and voice files.</li>
          <li>Turso: hosts the database.</li>
          <li>Google: sign-in, AI features above, and Google Calendar if you connect it.</li>
          <li>DeepSeek: AI text processing above.</li>
          <li>Resend: sends account emails such as password resets.</li>
          <li>Your browser&apos;s push service: delivers reminders if you turn them on.</li>
        </ul>
        <p>
          These providers may store or process data in Japan, the United States and, for DeepSeek,
          possibly China. We share only what each feature needs and choose providers that publish
          security and data protection terms. We do not control their systems.
        </p>
      </LegalSection>

      <LegalSection title="What other people can see">
        <p>
          Recipes are private to you unless you share them. Households, books and share links show
          what you choose to the people in them. <strong>A share link is public:</strong> anyone who
          has the link can open the shared recipe, including its photos and story. Photos and voice
          files are stored at long, hard-to-guess web addresses, but anyone who has an exact
          address can open it.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep your data while your account is open. When you delete a recipe it is removed from
          the app, but copies of its photos or voice files may stay in storage until we clean them
          up, and backups may keep deleted data for a limited time. A deleted household can be
          restored for 30 days and is then removed. Security counters are kept to prevent abuse.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <ul className="list-disc space-y-2 pl-5">
          <li>You can view and edit your recipes and settings in the app.</li>
          <li>
            You can ask us for a copy of your personal data, ask us to correct it, ask us to
            delete your account and its data, or withdraw your consent to a use (for example the AI
            features). Email {mail}. There is no delete-my-account button or data export yet, so we
            do this by hand and may need to confirm it is you.
          </li>
          <li>
            If you are unhappy with how we handle your data, tell us first. You can also contact
            Singapore&apos;s Personal Data Protection Commission.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We protect your data with encrypted connections, hashed passwords, limits on repeated
          sign-in attempts, checks on uploaded files, and the ability to sign out all your devices
          from Profile. No online service is perfectly secure. If a breach is likely to cause you
          serious harm, we will tell you and the authorities as the law requires.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Mychelin is for people aged 13 and over. You confirm this when you sign up. If we learn
          that someone younger has an account, we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          Mychelin is in beta, so this notice may change. We will update the date at the top. See
          also our <Link href="/terms" className="text-ui-accent underline">terms of use</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
