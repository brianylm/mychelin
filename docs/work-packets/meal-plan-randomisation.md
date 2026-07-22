# Work Packet Draft — Meal Plan Randomisation and Blockouts

Status: ready for product review, then first implementation pass
Owner: Agrippa + B
Updated: 2026-07-22 SGT (rev 3: undo mechanics, implicit-open slots, double-submit/perf gates, analytics, changelog)
Source roadmap item: Mychelin ROADMAP.md → Planning and calendar workflows

## Recent shipped / staged baseline

Do not plan this from the old broad UI-uplift branch. Current baseline is:

- Production remains pinned to the restored July 10 deployment after the broad July 19 workbench uplift was rolled back.
- `ui-uplift` branch staged at `https://mychelin-ui-uplift.vercel.app`:
  - Phase 1: landing performance/accessibility.
  - Phase 2: authenticated shell/navigation with hidden-view request checks.
  - Phase 3: Library staging candidate (recipe rows, search dialog, deduped Books fetching, token-ized to match landing theming).
  - Slice A: full `--ui-*` token set exposed, `IconButton` and `Dialog` primitives added.
- Next UI work after Phase 3 acceptance is recipe reading/editing hierarchy. Meal planning should not be mixed into that UI phase unless B explicitly chooses planning next.
- Current `MealPlanView` already supports week/month views, adding recipes to meal slots, calendar export, shopping-list handoff, cooking planned meals, recipe search/filtering, and recipe flags/last-cooked evidence.
- Target staging alias for this feature: `https://mychelin-ui-uplift.vercel.app`. Production stays pinned until B accepts.

## Starting points

- Planner UI: `app/src/components/planner/MealPlanView.tsx`
- Planner API: `app/src/app/api/meal-plans/route.ts` and `[id]/route.ts`
- Schema: `app/src/db/schema.ts` (`mealPlans` table)
- Runtime schema fixups: `app/src/db/ensure-schema.ts`
- Recipe flags: `app/src/lib/recipe-flags.ts`
- Shopping list: `app/src/app/api/shopping-list/route.ts`
- Calendar export: `app/src/components/CalendarExport.tsx`

## Product intent

Make Mychelin answer the practical daily question: “What should I cook this week?”

The feature should fill open meal slots using the user's saved recipes without forcing them to decide meal-by-meal. It must also respect real life: skipped breakfasts, eating out, travel, already-decided meals, and locked dishes.

This is not a generic random button. It is a planning assistant for a moved-out homecook trying to build a reliable cooking rhythm.

## Target user

A user who has some saved recipes and wants to plan meals for a day, week, or month quickly.

Most likely situation:

- They know some meals are not needed.
- They know some meals are fixed.
- They want Mychelin to fill the rest.
- They may prefer recipes marked `try_soon`, newly added, or not cooked recently.

## Core decision from B

Randomisation must work by selected timeframe, not only meal-by-meal:

- randomise one open meal slot
- randomise a day
- randomise a week
- randomise a month

Before randomising a day/week/month, users must be able to block out known-unavailable meal slots, such as skipped breakfasts or planned eating out.

## Slot model

Add explicit meal-plan slot states:

- `open`: can be filled by randomisation
- `locked`: already chosen and must be preserved
- `blocked`: skipped / not cooking / unavailable
- `eating_out`: planned meal outside home

Rules:

1. Randomisation only fills `open` slots.
2. Randomisation never overwrites `locked`, `blocked`, or `eating_out` slots.
3. Users can reverse blocked/eating-out slots back to `open`.
4. Existing manually selected meals become `locked` by default during scoped randomisation.
5. Empty slots are visually different from blocked slots. The plan must explain itself.

## V1 scope

Build this inside the existing Planner surface. Do not create a separate planning product.

V1 should include:

1. A scoped randomise control:
   - current slot
   - selected day
   - current week
   - current month
2. A lightweight pre-randomise review for day/week/month scopes:
   - show slots in scope
   - let user mark skipped/eating out/locked/open
   - confirm before applying
3. Recipe selection logic:
   - prefer recipes marked `try_soon`
   - include newly added recipes
   - down-rank recipes cooked very recently
   - avoid duplicate recipes in the same day unless the recipe pool is too small
   - fallback gracefully when there are too few recipes
4. Clear undo:
   - one-step undo after randomisation is enough for v1
5. Shopping-list compatibility:
   - generated plans must keep working with the existing shopping-list handoff
6. Calendar compatibility:
   - generated plans must keep working with current calendar export

## V1 non-goals

Do not add these in the first pass:

- nutrition-aware planning
- fridge/inventory-aware planning
- family-member preference optimization
- AI-generated recipes
- calendar prep lead-time events
- recurring plan templates
- collaborative family planning
- meal macros or calorie targets

Those are plausible later layers. They are not needed to validate whether scoped randomisation removes planning friction.

## Proposed data model (for B confirmation)

Use the existing `meal_plans` table rather than adding a new slot table. This is the smallest change that preserves user isolation and existing indexes.

Schema change:

- Add `state` column to `meal_plans`: `"open" | "locked" | "blocked" | "eating_out"`, default `"locked"`.
- Make `recipe_id` nullable. For `blocked`/`eating_out` slots, `recipe_id` is `null`.
- Existing rows default to `"locked"` so manually planned meals are never lost.

Migration: `app/drizzle/0028_meal_plan_slot_states.sql` (next available number at time of implementation; verify current `drizzle/` before numbering).

Runtime safety: because Mychelin does not auto-run migrations on deploy, add `ensureMealPlanStateColumn()` to `app/src/db/ensure-schema.ts` and call it at the top of the meal-plan API routes, mirroring the existing `ensurePlanningOwnershipColumns()` / `ensureMealPlanCookedAtColumn()` pattern.

API surface:

- `GET /api/meal-plans?startDate=…&endDate=…` already returns plans in range; it will now return `state` and include `blocked`/`eating_out` rows with `recipe: null`.
- `POST /api/meal-plans` creates a slot with `state: "locked"` (default for manually chosen meals).
- `PATCH /api/meal-plans/:id` can update `state` between `open`/`locked`/`blocked`/`eating_out`.
- New `POST /api/meal-plans/randomise` accepts `{ scope: "slot" | "day" | "week" | "month", date, ?mealType }` and returns the created plans. It only writes `open` slots; locked/blocked/eating_out are untouched.
- Existing `/api/shopping-list` and `/api/meal-plans` consumers must filter out `blocked`/`eating_out` slots (server-side and UI-side both, defensively).

Slot materialization and undo mechanics:

- **`open` slots are implicit** — they have no `meal_plans` row. Only `locked` (has recipe), `blocked`, and `eating_out` slots exist as rows. This keeps the table small and makes "empty vs blocked" trivially distinguishable.
- Randomising therefore **creates rows** for filled slots. The randomise endpoint returns the created plan IDs.
- **Undo is a batch delete of those created rows.** The client holds the returned IDs in memory (one level deep, cleared on view change or page reload) and calls `DELETE /api/meal-plans/:id` per created row, or a small `POST /api/meal-plans/randomise/undo` that takes the ID list and deletes only rows still owned by the user with `state: "locked"` and a non-null `recipe_id`. No server-side undo log needed for v1.
- **Skipping a planned meal clears the recipe decision**: marking a `locked` slot as `blocked`/`eating_out` sets `recipe_id = null`. Re-opening the slot means picking again (or randomising). This is deliberate — the plan must explain itself, and a hidden "remembered" recipe would contradict that.
- Scope "week"/"month" means the **currently viewed range in the planner** (respecting week/month offset navigation), using the same local `YYYY-MM-DD` date-key helpers already in `MealPlanView`.

## Recipe scoring algorithm (proposed default)

For each open slot, score every candidate recipe from the user's library:

```
score = 0
if flag includes "try_soon":     score += 40
if flag includes "newly_added":  score += 25
if lastCookedAt is null:         score += 15
else:
    daysAgo = (today - lastCookedAt) in days
    score += min(daysAgo * 2, 30)  # down-rank recent, cap at 30

# within the same day, avoid duplicates unless the pool is too small
if recipe already chosen for this day: score -= 80

# small bonus for variety across the plan
if recipe already chosen earlier in the same scope (week/month): score -= 20
```

Select the highest-scoring recipe per slot, filling slots in chronological order. If multiple recipes tie, pick deterministically by `id` to avoid jitter on re-render. If the pool is too small to avoid duplicates, prefer filling over leaving slots empty.

If no recipes exist, show: "You need at least one recipe before Mychelin can fill slots." If too few to avoid duplicates, show: "Only N recipes saved — some slots will repeat."

## UX direction

Keep it operational and calm:

- Primary CTA in the Planner header: `Randomise plan` (opens scope + review).
- On individual slots: `Lock`, `Skip`, `Eating out`, `Open` (only relevant actions shown).
- Pre-randomise review modal:
  - grouped by day
  - each slot shows current state and a one-tap state toggle
  - summary line: "X open slots will be filled"
  - confirm button: "Fill open slots"
- Post-randomise toast: "Filled X slots" with `Undo`.
- Do not make users fill every breakfast/lunch/dinner/snack.
- Do not use casino/random dopamine styling. It should feel like clearing mental load, not gambling.

Suggested copy:

- “Fill open slots”
- “Skip this meal”
- “Eating out”
- “Keep this dish”
- “Undo randomise”
- “Nothing to fill — all slots are locked or skipped”

## Operational notes

- **Double-submit protection**: the review modal's confirm button disables while the randomise request is in flight; the endpoint is safe to retry (it only fills slots that are still `open` at write time).
- **Performance gate** (rollback lesson): randomise issues one request and one batch insert — no per-slot round trips. Reuse the planner's existing `/api/recipes?planner=1` payload for candidates rather than adding a new fetch. Measure request count and slowest request on staging before sign-off.
- **Analytics**: emit `meal_plan_randomised` via the existing `trackUsageEvent` helper with sanitized properties only (`scope`, `slots_filled`, `slots_skipped`) — no recipe titles or notes. Also emit `meal_plan_slot_state_changed` for manual state toggles if cheap.
- **Changelog**: add a dated entry to `app/src/lib/changelog.ts` (repo convention for user-facing changes).
- **Accessibility**: the post-randomise toast ("Filled X slots", with Undo) must use the existing aria-live toast so screen-reader users hear the result. Slot state toggles expose their state (`aria-pressed` or visible text), never color alone.

## Acceptance criteria

1. A user can randomise one slot, day, week, or month.
2. A user can block/mark eating-out slots before scoped randomisation.
3. Randomisation preserves locked/blocked/eating-out slots.
4. Generated meals appear in the existing planner.
5. Existing shopping-list handoff still works for generated meals (blocked/eating-out excluded).
6. Existing calendar export still works for generated meals (blocked/eating-out excluded).
7. Empty/blocked/eating-out/locked states are visually clear on mobile.
8. The feature passes focused lint, TypeScript, production build, and `git diff --check`.
9. Preview deployment is used first; do not deploy to production before B accepts the staged planner behavior.
10. Smoke test with a synthetic user verifies user isolation for generated plans and blocked slots.

## Concrete smoke-test scenario

1. Create synthetic user A with 5 recipes (1 flagged `try_soon`, 1 `newly_added`, 3 normal).
2. User A plans 3 days × 3 meals = 9 slots. Lock 2 slots, block 2 slots, mark 1 as eating out.
3. Randomise the week.
4. Assert: only the 4 open slots got recipes; locked/blocked/eating-out unchanged.
5. Assert: `try_soon` and `newly_added` recipes are among the chosen ones.
6. Assert: the blocked/eating-out slots do not appear in the shopping list for that week.
7. Assert: calendar export for the week contains only the locked + newly randomised meals.
8. Create user B. Assert user B cannot see any of user A's plans, blocked slots, or generated meals (user isolation).
9. Undo the randomisation. Assert the 4 filled slots return to `open` with no recipe.
10. Clean up both users and all related rows.

## First implementation prompt skeleton

Act as a senior product engineer on Mychelin. Implement timeframe-aware meal-plan randomisation in the existing Planner surface with the smallest safe schema/UI change. Preserve existing meal-plan, shopping-list, calendar-export, and cook-from-plan behavior. Add slot states for open/locked/blocked/eating-out, scoped randomisation for slot/day/week/month, and a pre-randomise review for multi-slot scopes. Use existing recipe flags and last-cooked evidence for simple recipe weighting. Do not add nutrition, inventory, AI-generated recipes, or recurring templates. Validate with focused lint, TypeScript, production build, git diff check, and a preview smoke test covering user isolation and no overwrite of locked/blocked slots.

## Product trap checks

- If the user has too few recipes, the feature must say so and offer to fill what it can. It must not loop or create fake recipes.
- If every slot is blocked/locked, randomise should do nothing and explain why.
- If existing meal plans lack slot states, migration must default them safely to chosen/locked rather than overwriting them.
- If shopping-list generation assumes every plan has a recipe, blocked/eating-out slots must be filtered out.
- If month view is dense, the slot controls may need a modal/details sheet rather than cramming every state control into the grid.
- Undo must restore the exact previous state, including any open slots that were empty before randomisation.
- Deterministic ordering: same user, same plan, same recipes should produce the same result on repeated randomisations unless recipe flags/last-cooked change. Use recipe `id` as a tie-breaker, not `Math.random()`.
- Slot-state changes must not leak between users; every read/write is scoped to `mealPlans.userId`.
- Cook-from-plan and Cook With Me must still work for randomly generated meals; `mealPlanId` and recipe linkage are unchanged for `locked` slots and identical for newly filled slots.
- Touch targets for slot state toggles must be ≥ 44px on mobile.
