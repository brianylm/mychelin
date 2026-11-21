import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IngredientList } from "./IngredientList";

const handlers = {
  recipeId: 1,
  onAdd: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
};

describe("IngredientList loading", () => {
  it("shows a skeleton instead of the empty state while loading", () => {
    const html = renderToStaticMarkup(
      <IngredientList ingredients={[]} readOnly loading {...handlers} />,
    );
    expect(html).not.toContain("No ingredients yet");
    expect(html).toContain("Loading ingredients");
  });

  it("shows the empty state once loaded", () => {
    const html = renderToStaticMarkup(
      <IngredientList ingredients={[]} readOnly {...handlers} />,
    );
    expect(html).toContain("No ingredients yet");
  });
});
