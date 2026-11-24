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

  it("points to the self-serve export and account deletion in Profile", () => {
    expect(privacy).toMatch(/Download my data<\/strong> in Profile/);
    expect(privacy).toMatch(/Delete my account<\/strong> in Profile/);
    expect(privacy).toMatch(/Books you own are deleted for everyone/);
    expect(privacy).toMatch(/another member becomes admin/);
    expect(privacy).not.toMatch(/no delete-my-account button/);
  });

  it("states what deletion removes and the retention periods", () => {
    expect(privacy).toMatch(/When you delete a recipe, its photos and voice files are deleted/);
    expect(privacy).toMatch(/kept for 12 months/);
    expect(privacy).toMatch(/no longer carry your name, email or account/);
    expect(privacy).toMatch(/about 2 days after they\s+expire/);
    expect(privacy).toMatch(/7 days after they are\s+used or expire/);
    expect(privacy).not.toMatch(/until we clean them\s+up/);
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

  it("sends people to Delete my account in Profile to close their account", () => {
    expect(terms).toMatch(/Delete my account in Profile/);
    expect(terms).toMatch(/permanent/);
  });

  it("warns that AI recipes can be wrong and gives no medical advice", () => {
    expect(terms).toMatch(/can be wrong/);
    expect(terms).toMatch(/medical or dietary advice/);
  });
});
