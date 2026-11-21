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

describe("IngredientList amounts", () => {
  it("shows no unit word for a bare quantity", () => {
    const html = renderToStaticMarkup(
      <IngredientList
        ingredients={[
          { id: 1, recipeId: 1, name: "Onion", quantity: 1, unit: null },
          { id: 2, recipeId: 1, name: "Egg", quantity: 2, unit: null },
        ] as never}
        readOnly
        {...handlers}
      />,
    );
    expect(html).not.toContain("units");
    expect(html).toContain("Onion");
  });
});
