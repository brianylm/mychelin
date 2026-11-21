# Mychelin feature map

Find features using B's words, then use the entry to locate code, seed a reachable state, and avoid known traps. This is a code navigation map, not a claim that every flow has end-to-end coverage.

For any bug or change: find the entry → read **Traps** → **Set up** the state → reproduce with a failing spec → fix → run `bash scripts/verify.sh ui`. Update this map when adding a page, API route or component. `scripts/feature-map-check.mjs` enforces existing mapped paths, coverage of every page/API route/non-test component, and unique feature ids; it runs in fast verification. Directory paths with a trailing slash cover descendants; broad source roots do not.

Use `app/e2e/helpers.ts` only with explicit local test credentials supplied by `scripts/verify.sh`. Local verification uses a throwaway `turso dev` database on loopback, never production (app/.env.local is prod) and never the shared staging DB for writes. The runner reads staging schema DDL only. Seed synthetic users, recipes, audio and images only; family stories, photos, voices and transcripts are sensitive. `signup` inserts a synthetic user and mints a cookie; it does not test real signup/login. `cleanupUsers` and `cleanupHouseholds` remove fixtures; clean households before users. Use Asia/Singapore dates relative to now.

All app taps below start at `/app` with a signed-in, onboarded user unless stated otherwise. Most tabs are in-memory views, not separate URLs. Mobile navigation is **Library**, **Plan**, **Shopping**, **Inventory**. The header avatar is **Open profile for <name>**. Exact labels are quoted; `<id>`, `<name>` and `<title>` mean fixture values. For long content, scroll the key element into view inside its container before taking a viewport screenshot at CSS scale. Evidence: `.verify/last.json`, screenshots: `.verify/shots/` (generated, not committed).

## Landing & auth

### Landing hero {#landing}
- **B calls it:** landing, hero, scrim, homepage, first screen
- **Reach it:** open `/` in a signed-out context (signed-in users may be redirected); heading “Cook like home, even in your new home.”; `/preview` redirects to `/`.
- **Set up:** verify-screens fixture, before `signup`; use a fresh browser context.
- **Code:** `app/src/app/page.tsx`, `app/src/app/preview/page.tsx`, `app/src/components/LandingPage.tsx`, `app/src/app/globals.css`
- **API / tables:** no landing-specific API/table; auth session determines entry behavior.
- **Tests:** `app/e2e/verify-screens.spec.ts`, `app/src/app/auth-entry.test.tsx`, `app/src/lib/auth-entry.test.ts`
- **Traps:** Mobile hero readability depends on image/scrim and viewport. `/preview` is not a separate feature demo. Do not use real family photos for screenshot fixtures.

### Login and account recovery {#login}
- **B calls it:** login, sign in, Google login, forgot password, reset password
- **Reach it:** signed-out `/login`; `/reset-password` with a valid reset token for recovery. Signed-in home has no login tab; use a separate signed-out context.
- **Set up:** `signup`, `uniqueEmail` for authenticated state; real email/Google flows require their configured services. For request-level behavior use the auth scenario harness, not repeated signup calls.
- **Code:** `app/src/app/login/page.tsx`, `app/src/app/reset-password/page.tsx`, `app/src/components/auth/`, `app/src/context/AuthContext.tsx`, `app/src/lib/auth.ts`, `app/src/lib/return-to.ts`, `app/src/app/api/auth/`
- **API / tables:** `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/change-password`, `/api/auth/google/start`, `/api/auth/google/callback`; users, password_reset_tokens, auth_rate_limits.
- **Tests:** `app/src/app/api/auth/__scenarios__/email-auth.scenario.test.ts`, `app/src/app/api/auth/__scenarios__/google-oauth.scenario.test.ts`, `app/src/context/AuthContext.test.tsx`, `app/src/lib/return-to.test.ts`
- **Traps:** Signup/login are IP rate-limited; E2E tests mint cookies instead. New routes use Edge runtime and preferredRegion hnd1; Node POST routes hang on this Vercel project. Local Next Edge emulation installs a throwing setImmediate stub, which bcryptjs selects; local signup smoke failures do not establish a production signup failure. Do not change auth to work around that emulation artifact.

### Signup age confirmation {#age-gate}
- **B calls it:** age gate, age box, signup, minimum age
- **Reach it:** signed-out `/login?mode=signup`; use the “I'm 13 or older.” checkbox. Non-production layout trials use `ageGate=a`, `b`, or `c` on that URL.
- **Set up:** fresh context for UI; signup route tests supply ageConfirmed. `signup` deliberately bypasses this gate and cannot validate it.
- **Code:** `app/src/components/auth/AuthScreen.tsx`, `app/src/components/auth/LoginPageClient.tsx`, `app/src/app/api/auth/signup/route.ts`, `app/src/lib/legal.ts`
- **API / tables:** `/api/auth/signup` requires ageConfirmed true; Google start/callback enforce age confirmation for account creation; users, auth_rate_limits.
- **Tests:** `app/src/app/api/auth/signup/route.test.ts`, `app/src/app/api/auth/__scenarios__/google-oauth.scenario.test.ts`
- **Traps:** Age is self-confirmed, not date-of-birth collection. Trial layouts are non-production only. Do not infer account creation works from cookie-minted fixtures; local bcrypt smoke limitation is described under login.

## Onboarding

### Starting point and first-cook mission {#onboarding}
- **B calls it:** onboarding, first recipe, first cook, cook your first dish, goal flow
- **Reach it:** new user `/app` → “What do you have to start with?” → “A link”, “Notes or a message”, “A dish my family makes”, “Nothing yet”, or “Skip”. Existing onboarded home shows “Cook your first dish” → “Cook with me” until an attempt exists.
- **Set up:** `signup(..., { onboarded: false })` for onboarding; default `signup` plus `createRecipe` for the mission. Nothing-yet path offers “Use this dish”.
- **Code:** `app/src/components/onboarding/`, `app/src/components/mission/`, `app/src/components/RecipeWorkspace.tsx`, `app/src/app/api/user/`, `app/src/app/api/notifications/rhythm/`, `app/src/lib/feature-flags.ts`
- **API / tables:** `/api/user/preferences`, `/api/notifications/rhythm`, `/api/recipes`; users onboarding fields, notification_preferences, recipe_attempts.
- **Tests:** `app/e2e/onboarding.spec.ts`, `app/e2e/first-cook-mission.spec.ts`
- **Traps:** Onboarded defaults true in `signup`. “Not now — keep the mission for later” hides the mission only for the session; reload remounts it. FIRST_COOK_MISSION_ENABLED gates the flow. Mission and next-meal cards reduce the available inner scroll area; dismiss before feature screenshots.

## Recipes & capture

### Library, search and surprise {#library}
- **B calls it:** library, your recipes, search, surprise me, random recipe, recipe list
- **Reach it:** `/app` → “Library”; header “Search recipes”; “Open <title>” opens a recipe. “Surprise” on mobile / “Surprise me” on larger screens picks a recipe. “Open library panel” opens the mobile sidebar.
- **Set up:** `signup`, `createRecipe`; verify-screens fixture for a populated home; multiple recipes for search/random selection.
- **Code:** `app/src/app/app/page.tsx`, `app/src/components/RecipeWorkspace.tsx`, `app/src/components/layout/`, `app/src/components/search/`, `app/src/components/discover/`, `app/src/store/RecipeStore.tsx`, `app/src/app/api/recipes/route.ts`, `app/src/app/api/recipes/search/`, `app/src/lib/view-cache.ts`
- **API / tables:** `/api/recipes`, `/api/recipes/search?q=...`, `/api/books`; recipes, ingredients, recipe_flags, book_recipes.
- **Tests:** `app/e2e/recipe-select.spec.ts`, `app/src/lib/view-cache.test.ts`, `app/e2e/verify-screens.spec.ts`
- **Traps:** Sidebar and content can contain duplicate recipe titles: scope locators or use “Open <title>”. DiscoverView remains in code but has no primary nav tab; the reachable Surprise controls are in RecipeView. Recipe data access must go through `app/src/lib/recipe-access.ts` for multi-user isolation.

### Recipe reading, editing and heritage {#recipe-detail}
- **B calls it:** recipe detail, ingredients, steps, servings, edit recipe, family story, photo
- **Reach it:** “Library” → “Open <title>” or `/app?recipe=<id>` → “Recipe” tab; “Library info” and “Heritage & Family” expand extra fields. “Edit” unlocks editing; “Save and lock” returns to reading.
- **Set up:** `signup`, `createRecipe` with ingredients/instructions/yield, or verify-screens fixture; recipe photo/voice uploads require synthetic files and storage configuration.
- **Code:** `app/src/components/recipes/`, `app/src/components/heritage/CulturalContextCard.tsx`, `app/src/app/api/recipes/[id]/route.ts`, `app/src/app/api/recipes/[id]/ingredients/`, `app/src/app/api/recipes/[id]/instructions/`, `app/src/app/api/recipes/[id]/photos/`, `app/src/lib/recipe-photo-display.ts`, `app/src/lib/recipe-access.ts`
- **API / tables:** `/api/recipes/<id>`, nested ingredients/instructions/photos and photo beautify; recipes, ingredients, instructions, recipe_photos, recipe_flags.
- **Tests:** `app/e2e/recipe-select.spec.ts`, `app/e2e/verify-screens.spec.ts`, `app/src/components/recipes/ServingScaler.test.ts`, `app/src/lib/recipe-photo-display.test.ts`, `app/src/lib/step-ingredient-amounts.test.ts`
- **Traps:** Reading and editing modes expose different controls; collapsed fields are not missing data. Scaling is display-oriented; do not silently overwrite base quantities. Inner scrolling makes fullPage screenshots misleading. Photos/stories are sensitive; do not beautify or upload real family assets in tests. Nested access checks must preserve recipe isolation.

### Dish types and recipe flags {#dish-types}
- **B calls it:** dish types, meat, veg, rice and noodles, badges, favourite, flags
- **Reach it:** “Library” → “Open <title>” → “Edit” → “Library info” → “Dish type”; reading cards display type badges; recipe header has flag controls.
- **Set up:** `signup`, `createRecipe`; PUT `/api/recipes/<id>/dish-types` with dishTypes for an explicit override; varied titles/ingredients exercise inferred types.
- **Code:** `app/src/components/recipes/DishTypeBadges.tsx`, `app/src/components/recipes/DishTypeEditor.tsx`, `app/src/lib/dish-type.ts`, `app/src/app/api/recipes/[id]/dish-types/`, `app/src/db/schema.ts`
- **API / tables:** GET/PUT `/api/recipes/<id>/dish-types`; recipe_dish_types, recipe_flags.
- **Tests:** `app/src/lib/dish-type.test.ts`, `app/src/components/recipes/DishTypeBadges.test.tsx`
- **Traps:** Types are deterministic keyword rules, not AI. Labels include “Veg” and “Rice & noodles”. Explicit empty overrides differ from inferred/unset. Flags and dish types are distinct concepts; ensure the editor writes the representation the badges read.

### Link, paste, manual and AI draft capture {#recipe-capture}
- **B calls it:** import link, paste recipe, write recipe, scratchpad, ask Mychelin, AI draft
- **Reach it:** “Library” → “New recipe” → “Import from link”, “Write or paste recipe”, or “Ask Mychelin”; review the structure before saving.
- **Set up:** `signup`; API POST `/api/capture/url`, `/api/capture/paste` or `/api/capture/draft-recipe` for extraction, then `/api/recipes` for persistence. Use synthetic text; mock external AI/network responses for deterministic tests.
- **Code:** `app/src/components/capture/`, `app/src/app/api/capture/url/`, `app/src/app/api/capture/paste/`, `app/src/app/api/capture/draft-recipe/`, `app/src/app/api/capture/extract/`, `app/src/lib/manual-recipe-parser.ts`, `app/src/lib/capture-draft-storage.ts`
- **API / tables:** `/api/capture/url`, `/api/capture/paste`, `/api/capture/draft-recipe`, `/api/capture/extract`, `/api/recipes`; recipes, ingredients, instructions, usage_events.
- **Tests:** `app/src/lib/manual-recipe-parser.test.ts`, `app/src/lib/capture-draft-storage.test.ts`, `app/e2e/onboarding.spec.ts`
- **Traps:** Capture draft state and persisted recipe state differ. Extraction requires provider keys; local offline verification cannot establish live AI quality. URL imports can fail upstream. Preserve uncertain family quantities rather than inventing precise measurements.

### Voice capture and recordings {#voice-capture}
- **B calls it:** voice capture, record conversation, transcription, dialect, microphone, voice clip
- **Reach it:** “Library” → “New recipe” → “Live conversation” opens “Recipe conversation”; saved recipe → “Heritage & Family” for attached voice recordings.
- **Set up:** `signup`, `createRecipe`; open conversation with mocked microphone/transcription for deterministic tests. POST synthetic media to `/api/recipes/<id>/voice` only with test storage configured; no helper supplies real audio.
- **Code:** `app/src/components/capture/ConversationCapture.tsx`, `app/src/components/capture/ChatBubble.tsx`, `app/src/components/heritage/VoiceRecording.tsx`, `app/src/app/api/capture/realtime-transcription/`, `app/src/app/api/capture/transcribe-chunk/`, `app/src/app/api/capture/transcribe-whisper/`, `app/src/app/api/capture/conversation-assist/`, `app/src/app/api/recipes/[id]/voice/`, `app/src/lib/conversation-transcript.ts`
- **API / tables:** `/api/capture/realtime-transcription`, `/api/capture/transcribe-chunk`, `/api/capture/transcribe-whisper`, `/api/capture/conversation-assist`, `/api/recipes/<id>/voice`; recipes, voice_recordings, usage_events; conversation transcript is client capture state, not a dedicated transcript table.
- **Tests:** `app/src/lib/conversation-transcript.test.ts`, `app/src/lib/question-cards.test.ts`, `app/e2e/onboarding.spec.ts`
- **Traps:** Voice/transcripts are sensitive. Microphone permissions and browser speech support differ by device. CONVERSATION_REALTIME_ENABLED is false; do not assume the realtime endpoint is the active path. Inspect actual chunk/Whisper/provider fallback logic before changing it. unverified: live dialect accuracy; no real-audio pilot validation in this task.

## Cooking

### Cooking card grid and export {#cooking-card}
- **B calls it:** cooking card, card, grid, timeline, ingredient dots, download card
- **Reach it:** “Library” → “Open <title>” → “Card” tab; region “Cooking card timeline”. Reading mode is required for the tab toggle.
- **Set up:** `signup`, `createRecipe` with multiple ingredients/steps, or verify-screens fixture; detailed fixture examples in cooking-card-depth spec.
- **Code:** `app/src/components/recipes/CookingCard.tsx`, `app/src/components/recipes/CookingCardExport.tsx`, `app/src/lib/cooking-card-layout.ts`, `app/src/lib/cooking-card-markdown.ts`, `app/src/lib/cooking-card-verbs.ts`, `app/src/lib/feature-flags.ts`
- **API / tables:** existing recipe read API; ingredients, instructions; no separate cooking-card table.
- **Tests:** `app/e2e/cooking-card.spec.ts`, `app/e2e/cooking-card-depth.spec.ts`, `app/e2e/verify-screens.spec.ts`, `app/src/lib/cooking-card-layout.test.ts`, `app/src/lib/cooking-card-markdown.test.ts`, `app/src/lib/cooking-card-verbs.test.ts`
- **Traps:** COOKING_CARD_ENABLED hides all card UI when false. Grid is derived from recipe text, not persisted separately. View preference can persist across navigation. Scroll the region into view before capturing; a visible tab alone does not prove the grid is in the screenshot.

### Cook with me and multi-dish prep {#cook-with-me}
- **B calls it:** cook with me, start prep, guided cooking, timers, finish cooking
- **Reach it:** open a recipe → “Cook with me” under “Attempts & versions”; planned meals have “Cook <title>”; “Next meal” → “Start prep” starts its fresh dishes.
- **Set up:** `signup`, `createRecipe`; POST `/api/meal-plans` for a planned cook, or meal-pilot spec's fresh-dish meal group setup for multi-dish prep.
- **Code:** `app/src/components/recipes/CookWithMeSession.tsx`, `app/src/components/recipes/MultiCookWithMeSession.tsx`, `app/src/components/RecipeWorkspace.tsx`, `app/src/lib/meal-cooking-duration.ts`
- **API / tables:** `/api/recipes/<id>/attempts`, `/api/meal-plans/<id>`, meal group confirmation routes; recipe_attempts, meal_plans, meal_groups, inventory.
- **Tests:** `app/e2e/meal-pilot.spec.ts`, `app/src/lib/meal-cooking-duration.test.ts`
- **Traps:** Household-shared recipes the cook does not own run with different attempt permissions. Starting prep is not confirming consumption; confirm effects and retries must remain idempotent. Kitchen controls must remain usable with large touch targets and timers.

### Attempts, next try and recipe versions {#attempts-versions}
- **B calls it:** log cook, cooking notes, next try, closer to home, definitive version, rollback
- **Reach it:** open a recipe → “Attempts & versions” → “Log cook”; attempt history and version timeline follow ingredients/steps. Expand/select an attempt or version for its actions.
- **Set up:** `signup`, `createRecipe`; POST `/api/recipes/<id>/attempts` for synthetic attempts; use version/next-try routes to build compare/promotion state.
- **Code:** `app/src/components/recipes/AttemptHistory.tsx`, `app/src/components/versions/`, `app/src/app/api/recipes/[id]/attempts/`, `app/src/app/api/recipes/[id]/versions/`, `app/src/app/api/recipes/[id]/next-try/`, `app/src/lib/recipe-lineage.ts`
- **API / tables:** nested attempts, attempts/<id>/promote, versions, versions/compare, versions/<id>/rollback, next-try, next-try/promote; recipe_attempts, recipe_versions, recipe_next_tries, recipes.
- **Tests:** `app/src/lib/recipe-lineage.test.ts`, `app/e2e/meal-pilot.spec.ts`
- **Traps:** Attempts, suggested next tries and active versions are separate records. Promotion/rollback must keep ingredients/instructions and active version consistent. Preserve owner/access checks; do not overwrite another family member's source recipe.

## Planning

### Planner week and randomization {#planner}
- **B calls it:** meal plan, planner week, randomize week, dinner, eating out, blocked meal
- **Reach it:** “Plan” → “Randomize week”, “Previous period”, “Next period”; “Add a recipe to dinner” adds a dish; “Block dinner — eating something else” for solo users, “Mark me as not eating dinner” in households.
- **Set up:** verify-screens fixture, or `signup`, `createRecipe`, POST `/api/meal-plans` with date, mealType, recipeId, servings. Seed multiple recipes for randomization.
- **Code:** `app/src/components/planner/MealPlanView.tsx`, `app/src/components/planner/RandomizeReviewDialog.tsx`, `app/src/app/api/meal-plans/`, `app/src/lib/planner-randomize.ts`, `app/src/lib/planner-logged-meals.ts`, `app/src/components/CalendarExport.tsx`
- **API / tables:** `/api/meal-plans`, `/api/meal-plans/<id>`, `/api/meal-plans/blocks`; meal_plans, meal_plan_blocks, recipe_attempts, household_members.
- **Tests:** `app/e2e/planner-nav.spec.ts`, `app/e2e/planner-randomize.spec.ts`, `app/e2e/verify-screens.spec.ts`, `app/src/lib/planner-randomize.test.ts`, `app/src/lib/planner-logged-meals.test.ts`
- **Traps:** servings on a plan is a recipe multiplier (1 = one batch), not diners; portion targets live in targetPortions and are converted to the multiplier. Seed dates relative to SGT now so meals fall in the visible week. Household blocks apply to individuals, not the whole household. Logged cook entries are read-only calendar entries. Randomization should preserve blocked/occupied slots. The planner scrolls internally.

### Next meal home card {#next-meal}
- **B calls it:** next meal, tonight dinner, start prep, upcoming meal, home meal card
- **Reach it:** home “Library” or “Plan” → region “Next meal” → “Start prep”; ready-food-only meals show “Ready food only — just reheat.”
- **Set up:** `signup`, `createRecipe`, POST `/api/meal-plans` for today/tomorrow; use future SGT serveAt in `/api/meal-groups` for precise timing. verify-screens fixture seeds today's dinner.
- **Code:** `app/src/components/planner/NextMealCard.tsx`, `app/src/lib/next-meal.ts`, `app/src/components/RecipeWorkspace.tsx`
- **API / tables:** GET `/api/meal-plans?startDate=...&endDate=...`, GET `/api/meal-groups`; meal_plans, meal_groups, prepared_reservations.
- **Tests:** `app/src/lib/next-meal.test.ts`, `app/src/components/planner/NextMealCard.test.tsx`, `app/e2e/meal-pilot.spec.ts`
- **Traps:** Fetches today and tomorrow, not the full week. Cooked/past candidates and ready food have special selection rules. Query staleTime is 60 seconds; invalidate after changes. This card sits outside the recipe's scrolling area and consumes viewport space.

### Meal composition, confirmation and review {#meal-groups}
- **B calls it:** several dishes, ready food, diners, serving time, meal review, did you cook, leftovers
- **Reach it:** “Plan” → “Plan dinner with several dishes or ready food”; set dishes/diners/time in the composer. A past unconfirmed meal can prompt review on a later visit.
- **Set up:** `signup`, `createRecipe`; POST `/api/meal-groups` with date, mealType, serveAt, timezone, dinerCount; add fresh/prepared dishes with expectedRevision. Follow meal-pilot spec for complete payloads and idempotency keys.
- **Code:** `app/src/components/planner/`, `app/src/app/api/meal-groups/`, `app/src/app/api/meal-reviews/`, `app/src/lib/meal-pilot/`
- **API / tables:** `/api/meal-groups`, nested fresh-dishes/prepared-dishes/confirm/undo-confirmation/stations, `/api/meal-reviews`; meal_groups, meal_plans, prepared_reservations, meal_confirmation_commands, meal_fresh_effects, meal_station_assignments, meal_conflicts.
- **Tests:** `app/e2e/meal-pilot.spec.ts`, `app/src/lib/meal-pilot/domain.test.ts`, `app/src/components/planner/meal-pilot-components.test.tsx`
- **Traps:** Mutations use revisions and idempotency keys; do not replay with a new key to hide a conflict. Review “Later” suppression is session-scoped. StationAssignmentFields and stations API exist but station UI is not mounted; do not invent a tap route to it. Cleanup reservations before lots/groups to respect FK restrictions.

### Calendar export and Google sync infrastructure {#calendar}
- **B calls it:** calendar, Google calendar, sync, export meals
- **Reach it:** “Plan” → “Send to Calendar” opens calendar export when meals exist; Google connection/status and station UIs are currently unmounted, so no supported home tap route to Google connect. Inspect endpoints directly for backend bugs.
- **Set up:** `signup`, planned meals; calendar unit tests use mocked provider/database state. Real connect requires Google OAuth configuration; never use real calendars for local synthetic verification.
- **Code:** `app/src/components/CalendarExport.tsx`, `app/src/components/planner/MealCalendarStatus.tsx`, `app/src/app/api/meal-calendar/`, `app/src/lib/meal-calendar/`, `app/src/lib/calendar.ts`
- **API / tables:** `/api/meal-calendar/connect`, callback, disconnect, retry, shares, status, sync, webhook; calendar_connections, calendar_activities, calendar_shares, calendar_sync_jobs.
- **Tests:** `app/src/lib/meal-calendar/oauth.test.ts`, `app/src/lib/meal-calendar/token-service.test.ts`, `app/src/lib/meal-calendar/database.test.ts`, `app/src/lib/meal-calendar/events.test.ts`, `app/src/lib/meal-calendar/sync.test.ts`, `app/src/lib/meal-calendar/runner.test.ts`, `app/src/lib/meal-calendar/webhook.test.ts`
- **Traps:** Backend queue/sync support does not imply a launched UI. Disconnect/unshare/teardown must revoke access even when membership or connections are paused. OAuth tokens are sensitive; mock external effects in tests.

## Shopping & fridge

### Shopping list and buy-to-inventory {#shopping-list}
- **B calls it:** shopping list, groceries, tick items, bought it, move to fridge
- **Reach it:** “Shopping” → “Shopping List”; adjust “From” / “To”; household users can “Add to shared list”. Check items and use the inventory transfer flow.
- **Set up:** verify-screens fixture, or `signup`, `createRecipe`, POST `/api/meal-plans` then GET `/api/shopping-list?startDate=...&endDate=...`; household fixtures for shared manual items.
- **Code:** `app/src/components/shopping/`, `app/src/app/api/shopping-list/`, `app/src/lib/household-shopping.ts`
- **API / tables:** `/api/shopping-list`, `/api/shopping-list/items`, `/api/shopping-list/tick`, `/api/shopping-list/move-to-inventory`; shopping_list_items, meal_plans, ingredients, inventory, households.
- **Tests:** `app/src/lib/household-shopping.test.ts`, `app/e2e/households-slice2.spec.ts`, `app/e2e/verify-screens.spec.ts`
- **Traps:** meal_plans.servings is a multiplier of the recipe's yield, not a head count: the planner creates plans with 1 (one batch), so planning servings 2 for a 2-serving recipe correctly doubles every quantity. Don't report that as a bug. Generated recipe demand differs from manually persisted shared items. Dates, portions, unit compatibility and already-stocked ingredients affect quantities. Do not confuse ticking with completed transfer. Verify solo and household isolation separately.

### Ingredient inventory {#inventory}
- **B calls it:** fridge, inventory, pantry, freezer, expiry, stock
- **Reach it:** “Inventory” → “Add item”; storage choices include Fridge, Freezer, Pantry; row actions “Edit <name>” and “Remove <name>”.
- **Set up:** `signup`; POST `/api/inventory` for synthetic stock; use `openHousehold` and household API fixtures for shared inventory.
- **Code:** `app/src/components/fridge/FridgeView.tsx`, `app/src/app/api/inventory/`, `app/src/app/api/households/inventory/`, `app/src/app/api/ingredient-catalog/`, `app/src/app/api/ingredients/`, `app/src/lib/household-inventory.ts`, `app/src/components/ui/IngredientTypeahead.tsx`
- **API / tables:** `/api/inventory`, `/api/inventory/<id>`, `/api/households/inventory/deduct`, `/api/ingredient-catalog`, `/api/ingredients/suggest`; inventory, ingredient_catalog, household_activity_log.
- **Tests:** `app/src/lib/household-inventory.test.ts`, `app/e2e/households-slice2.spec.ts`
- **Traps:** Ingredient stock and cooked ready-food portions are separate models. Deduction is household-scoped and must handle compatible units and shortages. Expiry warnings use current time; seed relative dates. Catalog seeding is part of the local verifier.

### Ready meals and prepared portions {#ready-meals}
- **B calls it:** ready meals, cooked food, batch, leftovers, fridge portions, freezer portions
- **Reach it:** “Inventory” → “Ready meals” → “Add cooked food”; reserve ready food in the “Plan” meal composer.
- **Set up:** `signup`; POST `/api/prepared-batches` with title and lots such as [{storage: "fridge", portions: 2}]; meal-pilot spec demonstrates transfer, reservation and confirmation.
- **Code:** `app/src/components/fridge/ReadyMealsSection.tsx`, `app/src/components/planner/PreparedBatchForm.tsx`, `app/src/components/planner/PreparedBatchList.tsx`, `app/src/app/api/prepared-batches/`, `app/src/lib/meal-pilot/`
- **API / tables:** `/api/prepared-batches`, `/api/prepared-batches/<id>`, `/api/prepared-batches/<id>/transfer`; prepared_batches, prepared_lots, prepared_reservations.
- **Tests:** `app/e2e/meal-pilot.spec.ts`, `app/src/components/planner/PreparedBatchForm.test.tsx`, `app/src/components/planner/PreparedBatchList.test.tsx`, `app/src/components/planner/PortionStepper.test.tsx`
- **Traps:** Available, reserved and consumed portions differ. Fridge/freezer transfers must not duplicate portions. Reservations restrict lot deletion; fixture cleanup order matters. Household membership changes must not leak private batches.

## Households & sharing

### Household membership and shared recipes {#households}
- **B calls it:** join household, join code, invite link, household, shared household, remove member
- **Reach it:** “Open profile for <name>” → “Household” → “Start a household”, “Create”, or “Have an invite code?” → “Join code” → “Join”. Invite URL is `/join/<code>`. Recipe footer action “Share with household” enables Library household recipes.
- **Set up:** `signup` in separate contexts; `openHousehold`; POST `/api/households` {name}, read household.joinCode, then another user POST `/api/households/join` {joinCode}. `createRecipe`, POST recipe household-share for sharing. `devDb` supports lifecycle time travel locally.
- **Code:** `app/src/app/join/[code]/page.tsx`, `app/src/components/household/`, `app/src/app/api/households/`, `app/src/app/api/recipes/[id]/household-share/`, `app/src/app/api/recipes/[id]/fork/`, `app/src/lib/household-lifecycle.ts`, `app/src/lib/household-blocking.ts`, `app/src/lib/household-portions.ts`
- **API / tables:** `/api/households`, join, leave, members, recipes, recipes/<id>/import; `/api/recipes/<id>/household-share`, `/api/recipes/<id>/fork`; households, household_members, household_member_blocks, household_activity_log, recipes.
- **Tests:** `app/e2e/households.spec.ts`, `app/e2e/households-slice2.spec.ts`, `app/e2e/households-slice3.spec.ts`, `app/src/lib/household-lifecycle.test.ts`, `app/src/lib/household-blocking.test.ts`, `app/src/lib/household-portions.test.ts`
- **Traps:** One household per user; codes are case-insensitive. HOUSEHOLDS_ENABLED gates routes/UI. Sharing is explicit; joining does not publish every private recipe. Removal/leave, soft deletion and purge windows have different semantics. Clean households before users and delete reservations before lots. Recipe access must retain multi-user isolation through recipe-access.

### Public recipe and book share links {#share-links}
- **B calls it:** share link, shared recipe, WhatsApp link, save to Mychelin, revoke link, fork
- **Reach it:** open a recipe → “Share recipe”; open a book → “Share <book title>”; recipient opens `/shared/<token>` in a separate context.
- **Set up:** `signup`, `createRecipe`; POST `/api/share` with resourceType, resourceId, permission; read returned token/link. Use a second user/context to exercise recipient access and save; no dedicated helper creates a share link.
- **Code:** `app/src/components/sharing/`, `app/src/app/shared/[token]/page.tsx`, `app/src/app/api/share/`, `app/src/components/recipes/RecipeForkButton.tsx`, `app/src/components/recipes/ForkedFromBadge.tsx`, `app/src/lib/recipe-access.ts`
- **API / tables:** `/api/share`, `/api/share/<token>`, `/api/share/<token>/save`, `/api/share/<token>/beautify`, `/api/recipes/<id>/fork`; share_links, recipes, books, book_recipes, recipe_photos.
- **Tests:** `app/src/lib/recipe-lineage.test.ts`, `app/src/lib/auth-entry.test.ts`; no dedicated share-link Playwright spec.
- **Traps:** Public access is token-scoped, not owner authentication. Verify revoked/invalid tokens and recipient isolation. SHARED_RECIPE_CARD_ENABLED selects public layout. Shared photos/voice/stories may expose sensitive family content; synthetic fixtures only. Saving/forking must preserve provenance without granting source ownership.

## Books

### Recipe books and cooking principles {#books}
- **B calls it:** books, family cookbook, add to book, book count, cooking principles
- **Reach it:** “Library” → “Books” or “Open library panel” → “Books”; “Create book” opens creation. Open recipe → “Library info” for book selection. Open book → “Share <title>”.
- **Set up:** `signup`, `createRecipe`; POST `/api/books`, then POST `/api/books/<id>/recipes` to add recipes. Books specs contain exact membership payloads and mock cases.
- **Code:** `app/src/components/books/`, `app/src/components/recipes/BookSelector.tsx`, `app/src/components/layout/RecipeSidebar.tsx`, `app/src/app/api/books/`, `app/src/lib/books-client.ts`
- **API / tables:** `/api/books`, `/api/books/<id>`, nested recipes, members, tips, analyze-principles; books, book_members, book_recipes, book_tips, book_activity_log.
- **Tests:** `app/e2e/books-count.spec.ts`, `app/e2e/books-membership-subtitles.mocked.spec.ts`, `app/src/app/api/books/route.test.ts`, `app/src/lib/books-client.test.ts`
- **Traps:** Books live inside Library, not a fifth tab. Old BooksView/BookDetailView/InviteMemberModal were removed; member APIs exist but no current invite-member UI. Membership changes must invalidate sidebar counts/subtitles. Principles analysis needs an AI provider and is not verified by offline UI smoke.

## Profile & activity

### Profile, weekly goal and reminders {#profile}
- **B calls it:** profile, settings, weekly goal, reminders, comfort view, changelog, password
- **Reach it:** “Open profile for <name>” → “Profile & Settings”; “Your weekly dish goal”, “Browser reminders”, “Comfort view”, “Security”, “Changelog” are settings sections.
- **Set up:** `signup`; verify-screens fixture for profile screenshot. PATCH `/api/user/preferences` and notification preference/rhythm endpoints for stored settings; completed attempts populate goal progress.
- **Code:** `app/src/components/profile/`, `app/src/app/api/notifications/`, `app/src/app/api/user/`, `app/src/lib/changelog.ts`, `app/src/components/pilot/`, `app/src/app/api/pilot/`
- **API / tables:** `/api/user/preferences`, `/api/notifications/preferences`, rhythm, subscribe, vapid-public-key, dispatch; `/api/pilot/status`, `/api/pilot/feedback`; users, notification_preferences, push_subscriptions, notification_jobs, pilot_feedback, recipe_attempts.
- **Tests:** `app/e2e/verify-screens.spec.ts`, `app/src/lib/changelog.test.ts`, `app/e2e/first-cook-mission.spec.ts`
- **Traps:** Weekly dish goal counts finished attempts, not a daily streak. Browser reminders need permission/service-worker/push support; notification dispatch is a backend endpoint, not a home tap. Pilot feedback/checklist depends on stored progress. Do not test dispatch against real subscribers.

### Cooking log and activity {#activity}
- **B calls it:** cooking log, activity, history, what I cooked
- **Reach it:** “Open profile for <name>” → “Cooking log”; select an entry to open its recipe.
- **Set up:** `signup`, `createRecipe`, POST `/api/recipes/<id>/attempts`; completed attempts populate activity. No dedicated activity fixture helper.
- **Code:** `app/src/components/activity/`, `app/src/app/api/activity/`, `app/src/components/profile/ProfileView.tsx`
- **API / tables:** `/api/activity`; recipe_attempts, recipes, meal_plans.
- **Tests:** none
- **Traps:** Activity is a Profile subpage, not primary navigation. Keep private user activity separate from household activity and admin analytics. Timestamps and deleted recipes can affect rendered history.

## Admin & compliance

### Admin analytics and version migration tool {#admin}
- **B calls it:** analytics, funnel, pilot feedback, admin, migrate versions
- **Reach it:** navigate directly to `/admin/analytics`; there is no ordinary home nav action. Requires the configured admin identity. Migration is an API tool, not a visible feature.
- **Set up:** `signup` with a synthetic identity permitted by a local-only admin allowlist; create synthetic usage/pilot data through APIs. Do not reuse production admin credentials or call migration on a remote DB.
- **Code:** `app/src/app/admin/analytics/page.tsx`, `app/src/app/api/admin/`, `app/src/app/api/usage-events/`, `app/src/lib/admin-auth.ts`, `app/src/lib/usage-events.ts`
- **API / tables:** `/api/admin/analytics`, `/api/admin/migrate-versions`, `/api/usage-events`; users, usage_events, pilot_feedback, recipe_versions, recipes.
- **Tests:** `app/src/app/api/usage-events/route.test.ts`
- **Traps:** Admin routes require requireAdminUser; comments mentioning only logged-in users are insufficient. Migration writes/backfills data; migrations do not automatically run on deployment. Analytics may include user emails and comments: avoid private dumps/screenshots.

### Copyright and legal information {#compliance}
- **B calls it:** copyright, takedown, legal, terms, privacy
- **Reach it:** direct `/copyright` → “Copyright and takedown requests”; no primary signed-in nav tab. Age confirmation is mapped separately under age-gate.
- **Set up:** no DB fixtures; signed-out or signed-in navigation to `/copyright`.
- **Code:** `app/src/app/copyright/page.tsx`, `app/src/lib/legal.ts`
- **API / tables:** none; copyright agent contact comes from configuration.
- **Tests:** none
- **Traps:** This is a notice/instructions page, not an automated takedown API. Missing configured contact fields render fallback text; do not claim a full privacy/terms portal exists.

## Platform/PWA/infra

### App shell, offline cache, schema and verification {#platform}
- **B calls it:** PWA, install, offline, stale app, cache, loading, deploy, database
- **Reach it:** `/app` for shell/providers; browser install/offline controls are browser-dependent. Shared dialogs, fields and loading UI appear in the features above, not a standalone route.
- **Set up:** verify-screens fixture for shell; `bash scripts/verify.sh fast` for code checks and `bash scripts/verify.sh ui` for local seeded UI evidence. Browser offline/service-worker behavior needs explicit browser tests beyond ordinary online screenshots.
- **Code:** `app/src/components/PWARegister.tsx`, `app/src/components/providers/`, `app/src/components/ui/`, `app/src/app/layout.tsx`, `app/public/sw.js`, `app/src/db/schema.ts`, `app/src/db/ensure-schema.ts`, `app/drizzle/`, `scripts/verify.sh`, `scripts/feature-map-check.mjs`, `DEPLOYMENT.md`, `AGENTS.md`
- **API / tables:** app-wide schema/migrations; service worker keeps API requests network-only; no independent PWA table.
- **Tests:** `app/src/lib/service-worker-cache.test.ts`, `app/src/db/ensure-schema.test.ts`, `app/src/lib/feature-map-check.test.ts`, `app/e2e/verify-screens.spec.ts`
- **Traps:** Bump cache version in `app/public/sw.js` when changing cached behavior/assets. Deploy from repo root, never app/. New DB API routes use Edge runtime with preferredRegion hnd1 and `@/db`; Node POST routes hang on this Vercel project. Migrations do not auto-run. unverified: production has roughly 25 extra indexes from ensure-schema/migrations beyond a generated baseline; preserve deployed DDL through the read-only staging schema dump rather than assuming schema.ts alone recreates it. Never load app/.env.local for fixture writes; local verification uses throwaway turso dev and reads staging DDL only. Inspect `.verify/last.json` for known-failing smoke steps and retry evidence; exit 0 is not proof all smoke assertions ran.
