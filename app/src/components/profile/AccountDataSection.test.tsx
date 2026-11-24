import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AccountDataSection,
  DELETE_ACCOUNT_WARNING,
  deletionRequestBody,
} from "./AccountDataSection";

describe("AccountDataSection", () => {
  it("offers a data download and a quiet delete action", () => {
    const html = renderToStaticMarkup(<AccountDataSection authProvider="password" />);
    expect(html).toContain('href="/api/account/export"');
    expect(html).toContain("Download my data");
    expect(html).toContain("Delete my account");
  });

  it("warns that deletion is permanent, deletes owned books and hands over household admin", () => {
    expect(DELETE_ACCOUNT_WARNING).toMatch(/permanently/);
    expect(DELETE_ACCOUNT_WARNING).toMatch(/Books you own are deleted for everyone/);
    expect(DELETE_ACCOUNT_WARNING).toMatch(/another member becomes its admin/);
  });

  it("asks Google accounts for their email and others for their password", () => {
    expect(deletionRequestBody("google", " me@example.test ")).toEqual({ email: "me@example.test" });
    expect(deletionRequestBody("password", "secret ")).toEqual({ password: "secret " });
    expect(deletionRequestBody("password_google", "secret")).toEqual({ password: "secret" });
    expect(deletionRequestBody(null, "secret")).toEqual({ password: "secret" });
  });
});
