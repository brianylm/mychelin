# Work Packet — UI Uplift Next Phases (Proposal)

Status: proposal for product review and sequencing
Owner: Agrippa + B
Updated: 2026-07-22 SGT (rev 2: Slice B keeps attempts/next-try salient; Phase 3 sidebar token-ized)
Sources: `AGENTS.md`, `DESIGN.md`, `app/UI-BASELINE.md`, `app/UI-SYSTEM-AUDIT.md` (superseded sequence, valid end-states), `MEMORY.md` 2026-07-19 → 2026-07-21

## Current baseline

Do not plan from the rolled-back broad uplift. Current state is:

- Production remains pinned to the restored July 10 deployment (`dpl_AwWumTMyaKuMJDB9WUBSNijx7ku3`).
- `ui-uplift` branch staged at `https://mychelin-ui-uplift.vercel.app`:
  - Phase 1: landing performance/accessibility (Lighthouse mobile 59→74, LCP 9.6s→4.0s).
  - Phase 2: authenticated shell/navigation with hidden-view request checks.
  - Phase 3: Library staging candidate — awaiting B's acceptance.
- Phase 4 (recipe reading/editing hierarchy) is pre-declared as next after Phase 3 acceptance.
- Meal-plan randomisation packet exists separately at `docs/work-packets/meal-plan-randomisation.md`, awaiting product review.
- Standing rule from the July 19 rollback: small, independently reversible, preview-tested slices with per-surface interaction and request-timing gates. No broad multi-surface passes.

## Findings from a full repo pass (2026-07-22)

1. **The audit's Phase 1 primitive set is half-finished.** `app/src/components/ui/index.ts` exports 7 primitives (Alert, Button, EmptyState, Field, FilterBar, Panel, RecipeResultRow). `IconButton`, `Dialog`/`WorkflowDialog`, and `DataList` do not exist. Every modal in the app hand-rolls overlay, Escape, focus-trap/return, scroll-lock, and footer behavior.
2. **Tokens are defined but not exposed.** `globals.css` defines the full `--ui-*` set (surfaces, text, muted, borders, accent, action, focus, success/warning/danger/info + `-soft`), but only a subset is exported through `@theme inline` as Tailwind colors. The rest are only reachable via arbitrary-value syntax, which is why components fall back to raw values: 487 hardcoded color sites (`#800020`, `#17131f`, `neutral-*`, gradients, `backdrop-blur`) across 57 component files. Even shared primitives bypass tokens: `Alert.tsx` and `CollapsibleSection.tsx` use hardcoded Tailwind palette colors.
3. **Stale `"Satoshi"` font fallback** in `globals.css` (landing-content stack). It was removed during the July 19 Hallmark pass but crept back in when `globals.css` was restored to commit `34471a0` after the rollback.
4. **Body radial-gradient glow** is decorative; `.mychelin-app-shell` paints solid `--ui-bg` over it, so it only shows on the landing page. Verified acceptable for now; revisit if it ever bleeds into operational screens.
5. **Duplicate capture review components**: `capture/RecipeReview.tsx` vs `capture/RecipeCaptureReview.tsx`. Consolidation belongs in the capture phase.
6. **Books has no dedicated workspace view** — surfaced only through `RecipeSidebar`. DESIGN-AUDIT flagged this (issue 5.1). It is a product decision, not a styling one.
7. **The three heaviest files map onto the next three phases**: `RecipeView.tsx` (1,929 lines → recipe hierarchy), `MealPlanView.tsx` (961 lines → planner + randomisation), `ConversationCapture.tsx` (1,439 lines → capture flows; conversation capture remains paused until B confirms the staged UI).
8. **Deliberately deferred**: Radix Themes global stylesheet scoping and bundle measurement (until owning authenticated surfaces are in phase). Dark mode is an explicit non-goal (kitchen/senior use; locked warm-paper visual system).

## Proposed slices

Each slice is independently reversible, staged on the `ui-uplift` alias, and gated. Production stays pinned until B accepts the staged result.

### Slice A — Token and primitive foundation (prerequisite, no product surface)

- Expose the full `--ui-*` set via `@theme inline`: `border-strong`, `accent-muted`, `action`, `action-hover`, `action-text`, `focus`, `focus-soft`, and semantic `success/warning/danger/info` + `-soft` variants.
- Token-ize shared primitives only — identical visual output, screenshot-verified: `Alert.tsx`, `CollapsibleSection.tsx`, `Combobox.tsx`, `RecipeResultRow.tsx`.
- Remove the stale `"Satoshi"` fallback from `globals.css`.
- Add `IconButton` (44px minimum, required aria-label, focus-visible, loading/disabled states) and `Dialog` (overlay, focus trap and return, Escape, scroll-lock, mobile full-height option) to `components/ui/`. API-first per the audit's Phase 1; adopted by nothing yet, so zero regression risk.
- Gates: focused ESLint, `npx tsc --noEmit`, `npm run build`, `git diff --check`, responsive screenshot comparison at 320/375/414/768/1440. Staging alias only.

### Slice B — Phase 4: Recipe detail hierarchy (after Phase 3 acceptance)

- Re-hierarchy `RecipeView.tsx`: core content first (title, photo, servings, ingredients, steps); heritage metadata and ratings into progressive disclosure.
- **Attempts and next-try notes stay salient — they are the improvement loop, not archive material.** The active next try (what to change next cook) must be visible near the top of the recipe without opening anything, attempt history remains directly reachable from the recipe page (not buried in a collapsed section), and the "promote to version" path from an attempt stays one tap. Cook With Me should surface the active next-try at session start so last time's notes shape this cook.
- Replace gradient CTA/empty-state cards with restrained action rows; adopt `Panel`/`Field` for Details/Heritage; token-ize the 25 hardcoded sites as touched.
- Standardize recipe-page dialogs (share, Add to book, version details/compare, Log cook) on the new `Dialog`.
- Consolidate `RecipeReview.tsx` / `RecipeCaptureReview.tsx` if they serve the same step.
- Gates: Slice A gates + `smoke:privacy` on staging (recipe surface touches user-scoped data).

### Slice C — Phase 5: Planner surface + randomisation (after packet review)

- Implement `docs/work-packets/meal-plan-randomisation.md`: slot states (open/locked/blocked/eating_out), scoped randomise (slot/day/week/month), pre-randomise review, flag/last-cooked weighting, one-step undo.
- UI: slot states are visually distinct without color alone; `Dialog`-based review; token-ize the 21 hardcoded sites in `MealPlanView.tsx` as touched.
- Schema: smallest safe migration plus runtime ensure-schema helper, per project pattern.
- Gates: Slice A gates + `smoke:pilot` on staging; user-isolation check for generated plans and blocked slots.

### Slice D — Capture flows (after Slice B; conversation capture stays paused until B confirms)

- Build `WorkflowDialog` on `Dialog`; migrate `PasteRecipeModal`, `AiDraftRecipeModal`, `ManualRecipeScratchpadModal`, then `ConversationCapture`.
- User-first error copy (developer setup text only in operator context); persistent fallbacks (save raw transcript as draft, retry extraction, continue manually).
- Acceptance: transcript is not lost if extraction fails.
- Gates: Slice A gates + `smoke:pilot` on staging.

### Slice E — Operational surfaces: Shopping, Fridge, Activity, Profile

- `DataList` row treatment, semantic status badges (expiry, bought, cooked), `EmptyState` audit, token-ize remaining hardcoded sites as touched.
- Books dedicated view / bottom-nav destination: product decision for B (DESIGN-AUDIT 5.1).
- Gates: Slice A gates + `smoke:privacy` on staging.

### Slice F — Deferred watch list (documented, not scheduled)

- Radix Themes stylesheet scoping + bundle measurement (blocked until owning surfaces are in phase).
- OG images / share preview polish (DESIGN-AUDIT).
- Account deletion / data export UI (privacy surface; needs product decision).
- Offline indicator using the existing service worker.
- Dark mode: explicit non-goal.

## Sequencing recommendation

1. Slice A now — it touches no product surface, unblocks Phases 4/5, and can be staged and screenshot-verified independently of B's Phase 3 acceptance.
2. Phase 3 acceptance by B, then Slice B.
3. Meal-plan randomisation product review, then Slice C.
4. Slices D and E in that order, each after B confirms the previous staged slice.

## Validation protocol (every slice)

- Focused ESLint on touched files, `npx tsc --noEmit`, `npm run build`, `git diff --check` from repo root.
- Responsive checks at 320x568, 375x812, 414x896, 768x1024, 1440x900: zero horizontal overflow, composition preserved.
- Request-count/timing check for any surface that changes data loading (rollback perf lesson).
- `npm run smoke:privacy` when user-scoped data surfaces change; `npm run smoke:pilot` when the core loop changes.
- Deploy to the staging alias only; production stays pinned until B accepts.
- Append a dated entry to `MEMORY.md` per slice.
