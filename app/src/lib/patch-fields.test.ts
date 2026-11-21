import { describe, expect, it } from "vitest";
import { INGREDIENT_PATCH_FIELDS, INSTRUCTION_PATCH_FIELDS, pickPatchFields } from "./patch-fields";

describe("pickPatchFields", () => {
  it("drops id and recipeId so a row cannot move to another recipe", () => {
    const picked = pickPatchFields({ id: 9, recipeId: 999, content: "Stir", tip: null }, INSTRUCTION_PATCH_FIELDS);
    expect(picked).toEqual({ content: "Stir", tip: null });
  });

  it("keeps the editable ingredient fields only", () => {
    const picked = pickPatchFields(
      { recipeId: 2, name: "Onion", quantity: 1, approximate: false, userId: 5 },
      INGREDIENT_PATCH_FIELDS
    );
    expect(picked).toEqual({ name: "Onion", quantity: 1, approximate: false });
  });

  it("returns nothing for a non-object body", () => {
    expect(pickPatchFields(null, INSTRUCTION_PATCH_FIELDS)).toEqual({});
    expect(pickPatchFields([1, 2], INSTRUCTION_PATCH_FIELDS)).toEqual({});
  });
});

describe("RECIPE_PATCH_FIELDS", () => {
  it("drops ownership, sharing and version pointers", async () => {
    const { RECIPE_PATCH_FIELDS } = await import("./patch-fields");
    const picked = pickPatchFields(
      {
        id: 1,
        userId: 99,
        activeVersionId: 7,
        forkedFrom: 3,
        sharedToHouseholdAt: "2026-01-01",
        sharedToHouseholdBy: 99,
        isPublic: true,
        createdAt: "x",
        title: "Laksa",
        bookId: 4,
        status: "active",
      },
      RECIPE_PATCH_FIELDS
    );
    expect(picked).toEqual({ title: "Laksa", bookId: 4, status: "active" });
  });
});
