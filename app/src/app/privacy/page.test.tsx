import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./page";
import TermsPage from "../terms/page";
import { SUPPORT_EMAIL } from "@/lib/legal";

const privacy = renderToStaticMarkup(<PrivacyPage />);
const terms = renderToStaticMarkup(<TermsPage />);

describe("privacy notice", () => {
  it("gives a contact for data requests", () => {
    expect(privacy).toContain(`mailto:${SUPPORT_EMAIL}`);
  });

  it("names the AI processors and warns about the free tier and overseas processing", () => {
    expect(privacy).toContain("Gemini");
    expect(privacy).toContain("DeepSeek");
    expect(privacy).toMatch(/free-tier terms/);
    expect(privacy).toMatch(/outside Singapore/);
  });

  it("does not promise self-service deletion or export that does not exist", () => {
    expect(privacy).toMatch(/no delete-my-account button or data export yet/);
    expect(privacy).not.toMatch(/delete your account (in|from) (the app|settings)/i);
  });

  it("says share links and file addresses are open to anyone who has them", () => {
    expect(privacy).toMatch(/share link is public/);
    expect(privacy).toMatch(/anyone who has an exact\s+address/);
  });
});

describe("terms of use", () => {
  it("says beta, free for now, and links the privacy and copyright pages", () => {
    expect(terms).toMatch(/beta and free to use for now/);
    expect(terms).toContain('href="/privacy"');
    expect(terms).toContain('href="/copyright"');
  });

  it("warns that AI recipes can be wrong and gives no medical advice", () => {
    expect(terms).toMatch(/can be wrong/);
    expect(terms).toMatch(/medical or dietary advice/);
  });
});
