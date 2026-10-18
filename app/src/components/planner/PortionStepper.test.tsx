import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { effectivePortions, PortionStepper } from "./PortionStepper";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tagWithLabel(html: string, label: string): string {
  const match = html.match(
    new RegExp(
      `<button\\b[^>]*\\baria-label="${escapeRegExp(label)}"[^>]*>`,
    ),
  );
  if (!match) throw new Error(`no button with aria-label="${label}" in: ${html}`);
  return match[0];
}

describe("PortionStepper", () => {
  it("renders an empty input with the suggested portions and both controls", () => {
    const html = renderToStaticMarkup(
      <PortionStepper
        id="portions"
        label="How many portions?"
        value=""
        suggestion={4}
        onChange={() => {}}
      />,
    );

    expect(html).toContain('id="portions"');
    expect(html).toContain('placeholder="4"');
    expect(html).toContain('value=""');
    expect(html).toContain('aria-label="Fewer how many portions?"');
    expect(html).toContain('aria-label="More how many portions?"');
    expect(html).toContain("How many portions?");
  });

  it("disables decrementing at the minimum", () => {
    const html = renderToStaticMarkup(
      <PortionStepper
        id="portions"
        label="How many portions?"
        value="1"
        suggestion={4}
        min={1}
        onChange={() => {}}
      />,
    );

    expect(tagWithLabel(html, "Fewer how many portions?")).toMatch(
      /disabled(=|>|\s)/,
    );
    expect(tagWithLabel(html, "More how many portions?")).not.toMatch(
      /disabled(=|>|\s)/,
    );
  });
});

describe("effectivePortions", () => {
  it("uses the suggestion for blank input", () => {
    expect(effectivePortions("", 4)).toBe(4);
    expect(effectivePortions("   ", 4)).toBe(4);
  });

  it("parses numeric input", () => {
    expect(effectivePortions("3", 4)).toBe(3);
  });

  it("falls back to the suggestion for non-numeric input", () => {
    expect(effectivePortions("abc", 4)).toBe(4);
  });
});
