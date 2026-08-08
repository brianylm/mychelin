# Work Packet — Households: Shared Meal Plan, Inventory, and Shopping List

Status: decisions locked 2026-08-08, ready for product review, then first implementation pass
Owner: Agrippa + B
Source roadmap item: new — not yet in ROADMAP.md (add under Near term → Sharing and permissions, or its own Households section)

## Product intent

People who live and cook together should plan, shop, and stock together. A household is the shared operating layer for "the people I actually cook with": one shared meal calendar, one shared inventory, one shared shopping list.

This is not a book. Books are curated, shareable "best of" albums. A household is a working kitchen: it includes the untested, in-progress, Tuesday-night recipes that would never go into a book.

The desired feeling: the household's food life is in one place — anyone can see what's planned, what's in the fridge, and what to buy, without group-chat archaeology.

## Target user

- Moved-out homecooks sharing a flat (partners, roommates).
- Families planning meals together.
- Later (post-v1): caretakers running a second household for parents.

## Household vs Book — settled boundary

| | Book | Household |
|---|---|---|
| Purpose | Curated recipe album | Working shared kitchen |
| Shares | Recipes only | Meal plan, inventory, shopping list (+ recipe sharing affordance) |
| Membership | owner/editor/viewer | flat admin / member |
| Content bar | "Best of" — polished | Anything, including untested drafts |

Books are unchanged. A household does not replace books; recipes shared to a household are not automatically in any book.

## Locked product decisions (B, 2026-08-08)

### 1. What is shared in v1

Three surfaces, all household-scoped:

1. **Meal plan / calendar** — one shared plan; all members see the same slots.
2. **Inventory** — one shared inventory (the existing pantry/fridge/freezer model, household-scoped). "Pantry" naming in UI moves to **Inventory**.
3. **Shopping list** — one shared list per household.

Recipes are **not** implicitly shared (see decision 5).

### 2. Membership model

- **Schema: many households per user. UI: one household per user for day 1.** The data model is a join table (user ↔ household) so the caretaker-with-two-households case needs no migration later — only a UI context switcher.
- Roles: **member** and **admin**, flat hierarchy. The creator is an admin; admins can promote members to admin; admins can remove members **and other admins, including the original creator**. Members can always remove themselves (leave).
- Invite flow: **join code / link** (mirror the existing share-link pattern). Anyone with the join code can join while the household is live.
- **Empty-household trigger:** if no users (members or admins) remain, the 30-day deletion flow starts automatically.

### 3. Shared meal plan semantics

- One shared plan; everyone sees the same slots. Anyone can add, edit, randomise, or block.
- **Blocking is per member, per scope** — meal slot, day, week, or month (same granularity as planning). User A blocked Monday dinner → B sees "A is out" on that slot and keeps planning for themselves.
- **Portioning auto-scales by non-blocked eaters.** Recipe yields 4, household is 4, A blocked → slot shows serves 3; downstream quantities scale accordingly.
- A blocked member can still cook for the others — blocking marks *eating*, not cooking. No cook-assignment concept in v1.
- **Activity attribution:** the calendar shows who added which meal, and who blocked what/when (see decision 8).

### 4. Shared inventory semantics

- Single shared rows; any member can add, edit, or decrement. No per-person stock, no "who bought it" tracking.
- Personal items stored in the same physical fridge are simply **not tracked in Mychelin** in v1 — no private-item flag.
- **Cook-time deduction:** when a planned meal's cook session finishes, the app proposes the deduction ("used: chicken 500g, rice 2 cups") — the cook **confirms in one click, with the ability to edit quantities before confirming**.
- **Manual reconcile:** a member can adjust any quantity directly (stocktake), with the change attributed in the activity log.
- **Expiry:** shown in the UI only; no expiry notifications in v1.
- **Zero / negative stock:** surfaces as a **warning**, never blocks planning or cooking.

### 5. Recipe sharing inside the household

- **Private by default.** Recipes are invisible to the household until explicitly shared.
- **Per-recipe "share to household" flag** (schema supports it; bulk path below).
- **One-click bulk share:** "Share all my recipes with household" — a confirmed, one-time bulk action over the current library. Recipes created **after** the bulk share stay private until individually shared. Nothing auto-shares.
- A recipe shared to the household is visible to members (title, ingredients, steps) — including untested/draft-quality ones. This is the deliberate difference from books.
- **Un-imported shared recipe:** members can read it and run Cook With Me. The Cook With Me session is **ephemeral** — nothing lands in the cook's library.
  - **V1 assumption (flagged by B, confirm at build):** the session may record an attempt **on the plan slot itself**, visible to the household in the calendar, but attached to neither user's personal recipe history.
- **Imported shared recipe:** the member takes their own copy (fork via the existing `/api/share/[token]/save` mechanism, with `forked_from` lineage). Attempts, next-tries, comments, and ratings then live on the member's own copy. If A tests B's recipe, the learning accrues to **A's copy, not B's original**.
- **Attempts / next-tries visibility:** when a recipe is on the shared plan, its attempts and next-tries are visible to household members (this relaxes the usual privacy rule, household-wide, deliberately). Ratings stay private.
- Planner pickers stay scoped: when selecting from a list, a user picks from **their own library** (which includes their imports). Household-shared recipes enter someone else's plan via import, not direct selection.

### 6. Shopping list semantics

- One shared list per household, generated from the shared plan (scaled by non-blocked eaters per decision 3), plus manual add/edit.
- **Tick → inventory is a 2-step flow:** ticking marks an item bought; a separate explicit action ("move ticked items to inventory") pushes them into inventory with edit-before-confirm. Ticking alone never touches inventory.
- Portion scaling from blocking flows through to generated quantities (decision 3).

### 7. Roles, removal, and leaving

- Member leaves: their shared recipes stay on the household plan (ghost copies — decision 9); their own library is untouched; historical activity attribution stays as-is ("Brian added milk" remains).
- Admin removes member/admin: same data treatment as leaving.
- Flat admin hierarchy: no owner-only powers; any admin can remove any admin, including the creator.

### 8. Activity log and notifications

- **In-app activity feeds only, no activity push notifications:**
  - **Inventory log:** item added / removed / quantity edited, by who, when (mirrors the `bookActivityLog` pattern).
  - **Calendar log:** meal added by who, slot blocked for who/when, plan edits.
- **Push notifications stay reminder-only:** cook-execution reminders, plan-your-week CTAs, adoption nudges. Nobody gets "Brian used 2 eggs" pushes.

### 9. Deletion and the 30-day flow

- Trigger: last user leaves (empty household), or an admin deletes the household.
- During the 30 days the household is **dead/recoverable, not frozen**: gone from the UI; the **join code persists** and anyone holding it can reactivate the household wholesale.
- After 30 days: permanent deletion of the household, its plan, inventory, shopping list, and activity logs.
- **Ghost copies:** recipes from a departed member (or deleted household) stay usable in existing plan slots, but after the 30-day window, recipes not imported by a persisting member can no longer be selected for **future** plans.
- **Shared-link decommissioning:** share links to the deleted household's recipes/books stop resolving. Other users holding access to those recipes/books see a **"will be deleted on {date}"** tag and are encouraged to import (the existing save/fork flow covers recipes; verify whether books need an equivalent import-all affordance — **open implementation check**).

### 10. Naming

- UI says **Inventory**, not pantry. Storage locations (pantry / fridge / freezer) remain as locations *within* inventory.

## V1 scope

- Household create / join-by-code / leave / admin-remove / promote-to-admin.
- Household-scoped shared meal plan with per-member blocking (meal/day/week/month) and autoscaling portions.
- Household-scoped shared inventory with cook-time confirm-deduct, manual reconcile, expiry display, zero-stock warnings.
- Household-scoped shared shopping list with 2-step tick → inventory flow.
- Per-recipe "share to household" + one-time bulk share action.
- Read + ephemeral Cook With Me for un-imported shared recipes; import-to-own-copy via existing fork flow.
- Household activity feeds (inventory log, calendar log), in-app only.
- 30-day dead/recoverable deletion flow with join-code reactivation and ghost-copy plan behaviour.
- Feature kill switch, e.g. `HOUSEHOLDS_ENABLED` (mirror existing flags in `app/src/lib/feature-flags.ts`).

## V1 non-goals

- No multi-household UI (schema supports it; one household per user in UI).
- No cook assignment ("who's cooking tonight").
- No "who bought it" / cost splitting / personal-item flags.
- No expiry push notifications; no activity push notifications.
- No changes to books.
- No shared ratings — ratings stay private.
- No nutrition or inventory-driven recipe suggestion ("cook what's expiring") — later.

## Definition of done — v1

1. A user can create a household, get a join code, and a second user can join with it.
2. Both members see the same plan; either can add/edit/randomise; blocking is per member and visible to the other; portions autoscale by non-blocked eaters.
3. Shared inventory supports add/edit/decrement by any member; finishing a cook session on a planned meal proposes a deduction the cook can edit then confirm; manual reconcile works and is attributed.
4. Shared shopping list generates from the plan with scaled quantities; ticking marks bought; a separate confirmed action moves ticked items into inventory with editable quantities.
5. Recipes are private by default; per-recipe share-to-household and one-time bulk share both work; new recipes after bulk share stay private.
6. An un-imported shared recipe is readable and cookable (ephemeral Cook With Me); importing creates the member's own forked copy where attempts/comments/ratings live.
7. Attempts/next-tries on shared-plan recipes are visible to household members; ratings stay private.
8. Inventory and calendar activity feeds show who did what; no activity push notifications fire.
9. Empty household (or admin delete) starts the 30-day flow: household disappears, join code reactivates it; after 30 days data is gone; ghost copies behave per decision 9.
10. Everything behind `HOUSEHOLDS_ENABLED`; solo (non-household) users see zero change — existing plan/inventory/shopping remain per-user and untouched.
11. Migration under `app/drizzle/` with data impact explained; existing per-user rows are untouched (household scope is additive/nullable).
12. Validation: focused ESLint, `npx tsc --noEmit`, production build, `git diff --check`, Playwright regression specs pass; new e2e coverage for the household happy path and member isolation.
13. Preview-first on `mychelin-ui-uplift.vercel.app`; production only after B accepts.

## Implementation starting points

- Schema: `app/src/db/schema.ts` — new tables `households`, `householdMembers` (join, role), `householdActivityLog`; household-scoping columns (nullable `householdId`) on meal-plan slots, `inventory`, shopping list; `sharedToHouseholdAt`/equivalent on `recipes`. Migration conventions per AGENTS.md (add migration, explain data impact, verify with scripts).
- Existing patterns to mirror: `books` + `bookMembers` + `bookActivityLog` (`app/src/db/schema.ts:428-499`), share links `/api/share/` (`app/src/app/api/share/[token]/save/route.ts` for the fork/import flow), inventory routes `app/src/app/api/inventory/`, planner `app/src/components/planner/` + `app/src/app/api/meal-plans/`, shopping `app/src/components/shopping/` + `app/src/app/api/shopping-list/`.
- Access control: extend `app/src/lib/recipe-access.ts` carefully — multi-user isolation is high risk (AGENTS.md).
- Feature flags: `app/src/lib/feature-flags.ts`.
- Notifications (reminder-only): existing VAPID push plumbing; do **not** wire activity events into it.
- API routes: Edge runtime + `preferredRegion = "hnd1"` per AGENTS.md.

## Acceptance criteria

1. Two synthetic users join one household via code; each sees the other's plan edits with attribution.
2. A blocks Monday dinner; B's view shows A blocked; a serves-4 recipe in that slot scales to serves 3; shopping-list quantities scale identically.
3. Cooking a planned meal ends with an editable deduction proposal; confirming adjusts shared inventory; the inventory log records who confirmed.
4. Ticked shopping items do not touch inventory until the second confirmed action; quantities editable at that step.
5. Zero/negative stock shows a warning and blocks nothing; expiry dates render in the UI without notifications.
6. B shares one recipe to the household; A can read and Cook With Me ephemerally; A imports → A's copy carries `forked_from` lineage and its own attempts; B's original is untouched.
7. Bulk share moves B's whole library visible to the household; a recipe B creates afterwards stays private until shared.
8. A leaves: A's shared recipes remain as ghost copies on existing plan slots; activity attribution persists; post-30-day un-imported ghosts are not selectable for new plans.
9. Empty household → join code reactivates within 30 days → after 30 days, data gone and share links decommissioned with "deleted on {date}" tagging for link holders.
10. Solo users (no household) see identical behaviour to today — no schema coupling, no UI leakage.
11. `HOUSEHOLDS_ENABLED=off` removes all household surfaces cleanly.
12. Lint, typecheck, build, `git diff --check`, Playwright suite green; preview deployed for B's acceptance.

## Concrete smoke-test scenario

1. Seed synthetic users A (admin) and B (member). A creates household "Test Flat", gets join code; B joins.
2. A adds chicken rice (yields 2) to Monday dinner; B sees it with "added by A" attribution.
3. B blocks Monday dinner; slot scales to serves 1; shopping list for the week reflects the scale.
4. B ticks 2 items, edits one quantity at the inventory push step, confirms; inventory shows both items, log shows "added by B".
5. A shares a recipe; B Cook-With-Mes it without importing → no attempt in B's history; B imports → attempt on B's copy only.
6. B leaves; Monday slot keeps the recipe as a ghost; A still sees "blocked: B (Mon dinner)" history.
7. A leaves → household empty → 30-day flow starts; A reactivates via join code; then A deletes as admin and fast-forwards verification of the permanent-delete path (script-level, synthetic data only).
8. Seed user C with no household; assert zero household UI and unchanged personal plan/inventory/shopping.
9. Clean up all synthetic data.

## Product trap checks

- **Isolation first:** household queries must never leak across households or into solo users' data. Extend `recipe-access.ts`; add e2e isolation coverage. This is the highest-risk surface in the packet (AGENTS.md flags multi-user isolation explicitly).
- **Bulk share is one-time, not a mode.** Users will misread "share all" as "everything I ever make is shared." Copy must say it applies to the current library only.
- **Ghost copies must not resurrect privacy leaks:** a departed member's private (never-shared) recipes must not appear anywhere — ghosts only cover what was already shared/planned.
- **Autoscaling is per slot, per blocker:** two members blocking different meals must scale each slot independently; a fully-blocked slot should show "nobody eating" rather than serves 0 weirdness.
- **2-step shopping flow must survive partial ticks:** pushing "ticked items" twice must not double-add inventory (idempotency or clear already-moved state).
- **Confirm-deduct must not fire for ephemeral cooks** (un-imported shared recipe sessions) — there is no owned recipe to deduct against; either deduct from the plan-slot context with attribution, or skip deduction for v1 and log the decision.
- **Flat admins can deadlock socially** (two admins removing each other) — fine product-wise; just ensure the last-removal path lands in the 30-day flow, not a corrupted half-state.
- **Join-code reactivation must restore, not recreate** — reactivation after permanent deletion must fail cleanly.
- **Kill switch off must hide household surfaces without breaking existing per-user plan/inventory/shopping** — they share tables but not code paths where avoidable.
- **Service worker:** new household UI can stale-cache; bump `app/public/sw.js` cache version when shipping.
