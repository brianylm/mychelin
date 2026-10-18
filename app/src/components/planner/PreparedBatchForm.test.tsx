import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PreparedBatchForm } from "./PreparedBatchForm";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderForm(
  recipes: readonly { id: number; title: string }[],
): string {
  return renderToStaticMarkup(
    <PreparedBatchForm
      recipes={recipes}
      onSave={() => {}}
      onCancel={() => {}}
    />,
  );
}

function radioButton(html: string, label: string): string {
  const match = html.match(
    new RegExp(`<button\\b[^>]*>${escapeRegExp(label)}</button>`),
  );
  if (!match) throw new Error(`no radio button labelled ${label} in: ${html}`);
  return match[0];
}

describe("PreparedBatchForm", () => {
  it("defaults to a recipe when recipes are available", () => {
    const html = renderForm([{ id: 1, title: "Laksa" }]);

    expect(radioButton(html, "From my recipes")).toContain('aria-checked="true"');
    expect(radioButton(html, "Someone else made it")).toContain(
      'aria-checked="false"',
    );
    expect(html).toContain("Which recipe?");
    expect(html).toContain("Choose a recipe");
  });

  it("defaults to food from someone else when there are no recipes", () => {
    const html = renderForm([]);

    expect(radioButton(html, "Someone else made it")).toContain(
      'aria-checked="true"',
    );
    expect(radioButton(html, "From my recipes")).toContain(
      'aria-checked="false"',
    );
    expect(html).toContain("What is it?");
    expect(html).toContain(
      "You have no recipes yet — add this as food from someone else.",
    );
  });

  it("summarises the default fridge and freezer split", () => {
    const html = renderForm([]);

    expect(html).toContain("4 in the fridge · 0 in the freezer");
  });
});
