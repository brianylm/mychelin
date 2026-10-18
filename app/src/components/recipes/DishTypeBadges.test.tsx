import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DishTypeBadges } from "./DishTypeBadges";

describe("DishTypeBadges", () => {
  it("renders nothing when there are no types", () => {
    expect(renderToStaticMarkup(<DishTypeBadges types={[]} />)).toBe("");
  });

  it("renders labels", () => {
    const html = renderToStaticMarkup(
      <DishTypeBadges types={["meat", "vegetable"]} />,
    );
    expect(html).toContain("Meat");
    expect(html).toContain("Veg");
  });

  it("renders screen reader labels in icon mode", () => {
    const html = renderToStaticMarkup(
      <DishTypeBadges types={["meat", "vegetable"]} variant="icon" />,
    );
    expect(html).toContain('class="sr-only">Meat</span>');
    expect(html).toContain('class="sr-only">Veg</span>');
  });
});
