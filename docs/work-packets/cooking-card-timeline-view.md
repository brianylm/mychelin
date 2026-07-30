# Work Packet — Visual Cooking Card / Recipe Timeline View

Status: ready for product review, then first implementation pass
Owner: Agrippa + B
Updated: 2026-07-30 SGT
Source: Mychelin recipe read/cook UX + competitive analysis of `nic0le.com/recipes`

## Recent shipped / staged baseline

Do not plan this from the old broad UI-uplift branch. Current baseline is:

- Production remains pinned to the restored July 10 deployment after the broad July 19 workbench uplift was rolled back.
- `ui-uplift` branch staged at `https://mychelin-ui-uplift.vercel.app`:
  - Phase 1: landing performance/accessibility.
  - Phase 2: authenticated shell/navigation with hidden-view request checks.
  - Phase 3: Library staging candidate (recipe rows, search dialog, deduped Books fetching, token-ized to match landing theming).
  - Slice A: full `--ui-*` token set exposed, `IconButton` and `Dialog` primitives added.
- Next UI work after Phase 3 acceptance is recipe reading/editing hierarchy. This packet should be implemented on top of that recipe-reading baseline, not mixed into the current Phase 3 review.

Existing components this packet reuses:
- `RecipeView` / `RecipeDetailsCard` / `IngredientList` / `RecipeSteps`
- `CookWithMeSession` — step-by-step guided mode with timers, heat chips, ingredient matching
- `ServingScaler` — scale ingredient quantities by servings
- `matchIngredientsForStep()` — decide which ingredients are used in each step
- `HeatChip` / `parseHeatFromTip()` — step heat levels

## Product intent

Turn Mychelin recipes into a visual, shareable cooking card that answers "what do I do, and when?" at a glance. The existing recipe view is a readable form; the Cooking Card is a cookable timeline.

This is not a new data model or capture flow. It is a **read-mode UI transformation** of the recipe data Mychelin already stores, plus lightweight export.

## Target user

A family cook who has saved or imported a recipe and wants to:
- See the whole cooking flow in one screen before starting
- Scale servings and switch units without scrolling
- Share the recipe as a clean image or text in WhatsApp/Family group chat
- Tap "Start Cooking" and immediately enter the existing guided Cook With Me session

## Core decisions from B

- Build inside Mychelin as an alternate **recipe view mode**, not a separate tool or landing page.
- Use existing structured data: ingredients, instructions, prep/cook/total time, servings, cuisine/tags, recipe flags.
- Generate the visual grid client-side with CSS Grid; no LLM call at render time.
- Export: PNG image + copy-as-markdown/TSV. Google Sheets export is a future nice-to-have, not v1.
- Mobile-first: the card should be readable and shareable from a phone.

## V1 scope

1. **Cooking Card view mode**
   - Add a toggle/tab on the recipe page: "Recipe" (current) | "Card" (new).
   - Header: title, cuisine/tags, servings scaler (reuses `ServingScaler`), total/active/prep time, vessel.
   - Left rail: scaled ingredient list with checkboxes for mise en place.
   - Main area: horizontal timeline of step cards.
     - Each card: step number, short action title, heat chip, time estimate, matched ingredients (via `matchIngredientsForStep`).
     - Grid columns = steps; ingredient rows align vertically with the step cards they belong to.
   - Footer CTA: prominent **Start Cooking** → launches existing `CookWithMeSession`.

2. **Export actions**
   - **PNG**: render the card to an image using `html-to-image` (or equivalent) and trigger download/share.
   - **Copy**: copy a clean markdown/TSV summary of the recipe to clipboard for pasting into notes or chat.
   - PNG export must include a small Mychelin watermark/URL so shared cards point back to the app.

3. **Accessibility / mobile**
   - Timeline is horizontally scrollable on mobile; no tiny text.
   - Ingredient checkboxes and step cards have ≥44px touch targets.
   - Screen-reader announcement for "Card view" and step counts.

4. **Non-goals for v1**
   - No URL/image import LLM in this packet (that's the existing OCR/import roadmap item).
   - No auto-generated operations from steps (v1 keeps using existing instruction list as steps).
   - No collaborative editing or comments on the card.
   - No nutrition estimates or macros on the card.
   - No new recipe data model fields.

## Proposed implementation

### Data flow

The card is a pure read-only transformation of the existing `RecipeWithRelations` shape.

```
RecipeWithRelations
  → scaledIngredients (ServingScaler)
  → stepCards (map instructions, attach matched scaled ingredients + heat + time)
  → CSS Grid layout (ingredients column + step columns)
  → render + export
```

### Layout grid

Use a CSS Grid with explicit row spans:

```css
.cooking-card-grid {
  grid-template-columns: minmax(0, 5fr) repeat(N, minmax(120px, 1fr));
  grid-template-rows: repeat(M, var(--row-height));
}
```

- `N` = number of instruction steps.
- `M` = number of ingredients + setup rows + 1.
- Each step occupies one column; each ingredient occupies one row.
- A step card spans all ingredient rows it touches (based on `matchIngredientsForStep`).
- If matching is ambiguous, the step spans all ingredient rows and lists relevant ingredients explicitly inside the card.

This is intentionally simpler than `nic0le.com/recipes` (which merges operations like "Melt" / "Mix" / "Fold in"). V1 keeps Mychelin's existing step sequence and visualizes it.

### New / changed files

Likely additions:
- `app/src/components/recipes/CookingCard.tsx` — main card component
- `app/src/components/recipes/CookingCardGrid.tsx` — CSS Grid layout
- `app/src/components/recipes/CookingCardExport.tsx` — PNG / copy export buttons
- `app/src/lib/cooking-card-layout.ts` — layout helper: assign grid rows/columns from recipe + scaled ingredients + matched steps
- `app/src/lib/cooking-card-export.ts` — PNG + markdown/TSV copy helpers
- Tests: `cooking-card-layout.test.ts`, `CookingCardGrid` smoke test

Changes:
- `RecipeView.tsx`: add tab/toggle between existing view and Cooking Card.
- `CookWithMeSession.tsx`: accept an optional `initialView="card"` or ensure the Start Cooking button from the card opens it seamlessly.

### Technology choices

- `html-to-image` for PNG export (small, widely used, supports CSS Grid).
- Keep export on the client; no server-side image generation needed for v1.
- For "Copy markdown", use `navigator.clipboard.writeText` with a generated string.

## UX direction

Warm, calm, kitchen-friendly:
- Card background uses the existing warm surface color (`--ui-surface-raised`).
- Step cards use `--ui-accent` for active step numbers and `--ui-border` for dividers.
- Checkboxes for ingredients are simple and large; checking an item does not persist state (it is just a mise-en-place helper for the current cook session).
- "Start Cooking" is the primary action; export actions are secondary toolbar icons.

Suggested copy:
- "Card" / "Recipe"
- "Start Cooking"
- "Export PNG"
- "Copy recipe"
- "Serves {N}"

## Operational notes

- **Performance gate**: the card renders on recipe open; no extra network request. Layout computation should be ≤1ms for typical recipes (≤20 ingredients, ≤15 steps) using the existing matching algorithm.
- **Accessibility**: the card container is focusable and scrollable with arrow keys on desktop. Mobile touch scrolling is native.
- **Analytics**: emit `cooking_card_viewed`, `cooking_card_export_png`, `cooking_card_export_copy` via `trackUsageEvent` with recipe ID only (no titles/notes).
- **Changelog**: add a dated entry to `app/src/lib/changelog.ts` for "Cooking Card view with PNG export".

## Acceptance criteria

1. A user can open any recipe and switch to the "Card" view.
2. The card shows scaled ingredients and a horizontal timeline of steps.
3. Servings scaler works in Card view and updates ingredient amounts live.
4. Tapping "Start Cooking" opens the existing Cook With Me session for that recipe.
5. Export PNG produces a clean, shareable image of the card.
6. Export Copy produces a markdown or TSV summary on the clipboard.
7. Mobile: card is scrollable and readable; touch targets ≥44px.
8. Screen-reader users can navigate the card structure.
9. Existing recipe view behavior is unchanged.
10. Passes focused lint, TypeScript, production build, and `git diff --check`.
11. Preview deployment is used first; do not deploy to production before B accepts the staged card behavior.

## Concrete smoke-test scenario

1. Seed a synthetic recipe with 6 ingredients, 4 steps, and 2 recipe flags.
2. Open the recipe → switch to Card view.
3. Scale servings from 4 to 6; assert ingredient quantities update.
4. Tap "Start Cooking"; assert `CookWithMeSession` opens at step 1 with the scaled quantities.
5. Click Export PNG; assert a file download begins and the image contains the recipe title and steps.
6. Click Copy; assert clipboard contains a markdown summary with ingredients and steps.
7. Verify switching back to Recipe view preserves state.
8. Test with a recipe that has no ingredients and a recipe that has no instructions; card should degrade gracefully with a helpful message instead of crashing.

## First implementation prompt skeleton

Act as a senior product engineer on Mychelin. Implement a read-only "Cooking Card" view for recipes using the existing recipe data model and components. Add a Recipe/Card toggle on `RecipeView`, build a CSS Grid timeline that maps scaled ingredients to steps, wire the existing `CookWithMeSession` launcher, and add PNG + markdown export. Do not introduce new recipe fields, do not build URL/image import, and do not change the existing recipe editing flow. Validate with unit tests for the layout helper, focused lint, TypeScript, production build, git diff check, and a preview smoke test covering the scaling and export flows.

## Product trap checks

- If the recipe has no instructions, the card should show a friendly fallback rather than an empty grid.
- If the recipe has no ingredients, the card should show steps only and still allow starting Cook With Me.
- If `matchIngredientsForStep` returns no matches for a step, the step still renders in its own column; do not collapse steps.
- If PNG export fails (e.g., CORS on fonts), show a fallback "Copy text instead" button.
- Servings scaling must use the same math as `ServingScaler` to avoid confusing users switching between views.
- The card should not block the critical path to Cook With Me; even if the card has a rendering bug, the existing Recipe view and Start Cooking flow must still work.
- Export watermark should be small and not cover recipe text; it is a growth cue, not an ad.
- Touch targets on mobile must not overlap; test on the smallest common width (iPhone SE 375px).
- Do not let the card view become the default until B explicitly accepts it; default stays on the existing Recipe view.
