import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PreparedBatchList } from "./PreparedBatchList";
import type { PreparedBatchView } from "@/lib/meal-pilot/types";

function makeBatch(
  overrides: Partial<PreparedBatchView> = {},
): PreparedBatchView {
  return {
    id: 41,
    revision: 3,
    title: "Synthetic curry",
    recipeId: 12,
    cookedAt: "2026-10-12T08:00:00.000Z",
    notes: null,
    lots: [],
    totalPhysicalPortions: 0,
    totalReservedPortions: 0,
    totalUnallocatedPortions: 0,
    createdAt: "2026-10-12T08:00:00.000Z",
    updatedAt: "2026-10-12T08:00:00.000Z",
    ...overrides,
  };
}

const batchWithLots = makeBatch({
  lots: [
    {
      id: 101,
      storage: "fridge",
      physicalPortions: 2,
      reservedPortions: 2,
      unallocatedPortions: 0,
      useByDate: "2026-10-20",
      revision: 1,
    },
    {
      id: 102,
      storage: "freezer",
      physicalPortions: 4,
      reservedPortions: 1,
      unallocatedPortions: 3,
      useByDate: "2026-12-20",
      revision: 1,
    },
  ],
  totalPhysicalPortions: 6,
  totalReservedPortions: 3,
  totalUnallocatedPortions: 3,
});

describe("PreparedBatchList", () => {
  it("shows the empty state with an add button", () => {
    const html = renderToStaticMarkup(
      <PreparedBatchList batches={[]} onAdd={() => {}} />,
    );

    expect(html).toContain("No ready meals yet");
    expect(html).toContain("Add cooked food");
    expect(html).toContain('<button type="button"');
  });

  it("marks the list busy while loading instead of showing the empty state", () => {
    const html = renderToStaticMarkup(
      <PreparedBatchList batches={[]} loading onAdd={() => {}} />,
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("No ready meals yet");
  });

  it("renders fridge and freezer lots with portion counts and badges", () => {
    const html = renderToStaticMarkup(
      <PreparedBatchList batches={[batchWithLots]} onAdd={() => {}} />,
    );

    expect(html).toContain("2 portions · 2 planned · 0 free");
    expect(html).toContain("4 portions · 1 planned · 3 free");
    expect(html).toContain("Ready — fridge");
    expect(html).toContain("Ready — frozen");
  });

  it("mutes a batch that has no physical portions left", () => {
    const html = renderToStaticMarkup(
      <PreparedBatchList
        batches={[makeBatch({ totalPhysicalPortions: 0 })]}
        onAdd={() => {}}
      />,
    );

    const article = html.match(/<article\b[^>]*>/)?.[0];
    if (!article) throw new Error(`no <article> in: ${html}`);
    expect(article).toContain("text-ui-muted");
  });
});
