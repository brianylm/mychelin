import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

const checker = path.resolve("../scripts/feature-map-check.mjs");

test("feature map enforces paths, nested coverage, bare-root exclusions and unique ids", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mychelin-feature-map-"));
  try {
    for (const directory of ["app/src/app/api/dishes", "app/src/components/dishes"]) {
      mkdirSync(path.join(root, directory), { recursive: true });
    }
    for (const file of ["app/src/app/page.tsx", "app/src/app/api/dishes/route.ts", "app/src/components/dishes/Dish.tsx", "app/src/components/dishes/Dish.test.tsx"]) {
      writeFileSync(path.join(root, file), "");
    }
    const valid = "### Dishes {#dishes}\n`app/src/app/page.tsx` `app/src/app/api/dishes/` `app/src/components/dishes/`\n";
    const run = (map: string) => {
      writeFileSync(path.join(root, "FEATURES.md"), map);
      return spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
    };
    expect(run(valid).stdout).toBe("feature-map: OK (1 features, 3 paths)\n");
    expect(run(valid + "`app/missing.tsx`").stderr).toContain("missing mapped path: app/missing.tsx");
    expect(run(valid + "### Again {#dishes}\n").stderr).toContain("duplicate feature id: dishes");
    const uncovered = run("### Root {#root}\n`app/src/app/` `app/src/app/api/` `app/src/components/`\n");
    expect(uncovered.status).toBe(1);
    expect(uncovered.stderr).toContain("unmapped file: app/src/app/api/dishes/route.ts");
    expect(uncovered.stderr).toContain("unmapped file: app/src/components/dishes/Dish.tsx");
    expect(uncovered.stderr).not.toContain("Dish.test.tsx");
    // Missing individual files are also rejected even if another ancestor exists.
    expect(run(valid + "`MISSING.md`").status).toBe(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
