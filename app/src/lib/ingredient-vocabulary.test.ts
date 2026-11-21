import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALIASES, CATALOG_NAMES, EXTRA_NAMES, vocabularyTerms } from "./ingredient-vocabulary";

describe("ingredient vocabulary", () => {
  it("covers every name in the ingredient_catalog seed", () => {
    const sql = readFileSync(join(__dirname, "../../drizzle/seed_ingredient_catalog.sql"), "utf8");
    const seeded = [...sql.matchAll(/^\s*\('((?:[^']|'')*)',/gm)].map((m) => m[1].replace(/''/g, "'"));
    expect(seeded.length).toBeGreaterThan(100);
    const known = new Set<string>(CATALOG_NAMES);
    expect(seeded.filter((name) => !known.has(name))).toEqual([]);
  });

  it("aliases point at real names", () => {
    const names = new Set<string>([...CATALOG_NAMES, ...EXTRA_NAMES]);
    expect(Object.entries(ALIASES).filter(([, name]) => !names.has(name))).toEqual([]);
  });

  it("orders terms longest first", () => {
    const terms = vocabularyTerms();
    for (let i = 1; i < terms.length; i += 1) {
      expect(terms[i - 1].term.length).toBeGreaterThanOrEqual(terms[i].term.length);
    }
  });
});
