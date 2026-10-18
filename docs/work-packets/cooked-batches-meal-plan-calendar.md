# Work Packet Draft — Multi-Dish Meals, Cooked Batches, and Calendar Activities

Status: approved for implementation 2026-10-15; execute in bounded tasks with DeepSeek implementation and Sol foundation/review
Owner: B + Codex
Updated: 2026-10-13
Source: B's six-portion Japanese curry example and request for fresh/frozen calendar labels and cooking time blocks.

## Product intent

Plan complete meals using several dishes, recipes still to cook, and food already prepared. A typical meal is two dishes plus one soup. One cooking batch can supply several meals. Make the work required for each meal visible in Mychelin and in Google Calendar without requiring app interaction during cooking or eating.

Primary user: solo home cook or household that cooks several portions ahead and schedules them across the week.
Pilot proof: enter six already-cooked curry portions, allocate three meals of two portions, distinguish chilled/frozen portions, and schedule only the preparation actually required.

## Confirmed requirements from B

- Already-cooked food can enter the meal plan without starting or logging a cooking session.
- A six-portion batch can supply three separate meal slots of two portions.
- Distinguish frozen prepared meals from fresh meals visibly on the meal-plan calendar.
- Make meal activities available on Google Calendar, with a time block when cooking is required.
- A meal can contain multiple dishes, including the explicit two-dishes-and-one-soup example; allow mixed fresh/prepared sources within a meal.
- Fresh cooking creates one continuous event covering preparation and cooking until serving. The meal's serving time and duration are editable.
- Timing rule locked on 2026-10-13: the longest fresh recipe's complete prep + cook duration, plus 15 minutes of buffer, sets the meal block ending at serving time. Recipes are cooked in parallel where appropriate.
- Frozen dishes need an earlier calendar event reminding the user to defrost. They do not need a separate reheating block; reheating instructions belong in the mixed meal's main calendar event. This supersedes the previous draft's exclusion of all frozen-food events/alarms.
- The main event includes a high-level summary for reheating prepared dishes and links to the fresh dishes' cooking session, including a grouped session for several fresh recipes.
- Grouped cooking should accommodate parallel use of named appliances and stations such as microwave, slow cooker, oven, rice cooker, and individual hob/burner positions.
- B accepted optional batch planning such as make six portions, eat two, save four, provided it is unobtrusive.
- B wants a cook → eat experience without continually updating Mychelin. Confirm elapsed meals on the user's next authenticated app visit with a popup asking whether the meal happened and whether consumption matched the plan. No confirmation is required during cooking/eating.
- Specify how many people are eating when planning the complete meal; inspect/reuse existing household portion logic where appropriate.
- Automatic Google Calendar updates are required. A user-confirmed export snapshot alone does not satisfy the request.
- Updates are two-way for meal timing: dragging the managed cooking event in Google changes the meal time in Mychelin. Resulting conflicts are reconciled or resolved in Mychelin.
- Use one dedicated shared Mychelin calendar per household, which members can optionally add alongside their other Google calendars. A solo user's calendar is private to that user; there is never one global calendar exposing all Mychelin households.
- Defrost reminders use an editable saved default; B explicitly deferred further defrost refinement to pilot iteration.
- Missing recipe timing should be handled during recipe creation where possible, with a fallback timing prompt when planning/exporting an incomplete recipe. Whether timing blocks recipe saving is not settled.
- Continue the Pantry/meal-planning pilot focus; transcription work remains paused.

## Current baseline, verified in the repository

- `meal_plans.recipe_id` is required and `servings` is a multiplier of recipe yield, not an absolute portion count.
- Planner Add and Randomize currently hard-code `servings: 1`; the add dialog does not expose a diner count. Household display, shopping, and deduction derive a proportional factor from actual account members minus per-member blocks. With nobody blocked, this keeps the full recipe yield rather than scaling it to the actual number eating.
- `users.householdSize` exists as a preference but is not used for planner eater math. Guests or a chosen per-meal diner total cannot currently be entered in the planner. The recipe-page ServingScaler changes display quantities locally, not meal-plan diners.
- Multiple recipe rows may share a date/meal-type slot, and Cook together opens the current combined session. There is no shared meal entity/diner count yet, and existing calendar export emits a separate generic event per recipe row.
- Logged attempts appear as read-only entries on their cooking date. They do not represent a remaining batch that can be allocated to later dates.
- Shopping requirements are generated from meal-plan recipe ingredients. Prepared meals need an explicit exclusion to avoid shopping for those ingredients again.
- Existing calendar export builds a one-hour meal event at default breakfast/lunch/dinner/snack times, without distinguishing cooking from eating.
- The app already has `MultiCookWithMeSession`: multiple recipe panels, independent step positions, simultaneous timers, and saving an attempt for each recipe. It does not yet coordinate appliance occupancy or an interleaved cooking schedule, and completion currently marks recipe plan rows cooked rather than tracking a whole meal eaten.
- Google export opens a prefilled event for user confirmation. It is not an automatic synchronization connection. Multiple events currently open multiple tabs, which is unsuitable for a larger plan.
- Google OAuth currently requests only sign-in scopes (`openid email profile`), discards access/refresh credentials, and stores only `googleSub`. There is no Calendar connection/event map/sync token/watch metadata. Implement a separate Connect Calendar flow, including for password users, rather than widening ordinary sign-in silently.
- There is no existing generic sync worker/webhook. Daily notification dispatch and its Web Push retry records are useful references but are too coarse and specialized for automatic calendar reconciliation; add a bounded durable sync/outbound-work mechanism and renewable event watches.
- ICS generation currently attaches generic defrost/prep alarms to every event; these must become explicit and appropriate to the selected activity.
- The checkout contains unrelated deployed hero/session work. Preserve that work. Local default DB settings have previously pointed at production: use isolated mocks/in-memory tests and a verified test DB only.

## Proposed v1 behavior

These are reviewable defaults, not claims about already-shipped behavior.

### Meal source and calendar labels

One meal groups multiple dish entries. Keep each dish's source separate from meal completion. Use readable text plus a supporting icon in both week and month calendars:

| Source | Visible label | Action required |
| --- | --- | --- |
| Recipe to prepare | Cook fresh | Cook the recipe |
| Already-cooked chilled batch | Ready — fridge | Eat; optional reheat |
| Already-cooked frozen batch | Ready — frozen | User-chosen defrost/reheat |

After completion, show Eaten separately from the source label. A cooking record is still associated with when food was made; consuming stored food does not create another cook attempt.

Show every dish and its source within its meal, with compact overflow/expand behavior for narrow month cells. A mixed meal can show two Cook fresh dishes and one Ready — frozen soup. Do not label the entire meal Frozen when only its soup is frozen.

Existing planner slots already accept several recipe rows. Extend that baseline with explicit meal grouping and a common serve time; do not regress existing multiple-dish plans to a single recipe per meal. Fresh dishes share the meal's one cooking event. Reusable prepared batches are referenced by their dish entries.

The meal has an explicit diner count. Default each fresh dish's target yield to that count, with optional per-dish overrides and extra-batch output. Use recipe-yield conversion internally; never interpret a recipe multiplier of 2 as necessarily two people. Shared-dish diners and absolute prepared portions must be presented separately and unambiguously.

For a dish with a reliable base yield of four people and a meal for two, default its ingredient scale to 2/4, rather than leaving the multiplier at one. Optional make-extra output overrides the made quantity, not the meal's diner count. Household membership supplies a suggested count only; user-selected actual diners can include guests/non-members and must not be silently replaced by account count. Ambiguous shared-dish yields require a confirmed quantity instead of a guessed conversion.

Use “fresh” carefully: a future Cook fresh slot and food previously cooked and kept in the fridge are distinct. The above three labels make that distinction explicit.

### Entering prepared food

- Add a prepared batch by title, actual available portions, and storage: fridge or freezer. Optional recipe link, cooked date, and user-entered use-by date.
- Manual entry does not deduct raw Pantry ingredients: the food was already made, and stock may already reflect that.
- Support food made outside Mychelin with no recipe link. Recipe deletion must not erase food already tracked.
- If one cook yields two chilled and four frozen portions, create two linked storage lots under one batch. Storage belongs to the lot, rather than a single mutable label on the whole batch.
- Later moving portions between storage locations preserves total portions and existing reservations. The planned meal retains its selected preparation choice until explicitly edited; flag relevant changes for review.
- Optional per-dish “Save extra portions” controls permit batch planning in advance; ordinary meal planning defaults to cooking for that meal only. Planned extra portions are expected stock until cooking is confirmed, either from an actual saved session or later meal confirmation. Do not silently treat a scheduled future cook as existing physical food.

### Allocation and consumption

- Store absolute portion allocations, independent of the recipe-yield multiplier used by existing plans.
- For a lot, display remaining physical stock, reserved stock, and unallocated stock. Six untouched portions allocated 2+2+2 means six physically remaining, six reserved, zero unallocated.
- Scheduling reserves portions; confirmation of actual consumption consumes them once. Moving/removing an unconsumed dish releases its reservation. Repeated taps/retries cannot consume twice.
- Reject over-allocation across slots or household members, including concurrent requests. Do not silently allocate unavailable food.
- Undo Eaten restores the consumed portions and reservation once. Stocktake/discard cannot silently reduce stock below reservations: require resolving affected meals.
- Household eater changes flag a portion review; do not silently consume or increase reservations. Existing fresh-recipe eater scaling stays separate.
- Personal batches remain user-owned; shared batches are household-scoped. Both solo users and households get the prepared-food workflow.

### Confirmation on the next app visit

- Once a meal's scheduled serving time has elapsed, include it in a review popup on the next authenticated app visit/login. Do not interrupt the cooking session or require a return visit immediately after eating.
- Proposed actions: “Yes, as planned”, “Adjust”, “Didn't have this meal”, and “Later”. One whole-meal confirmation accepts planned dish amounts; Adjust permits actual diners, per-dish consumed portions, skipped dishes, and batch output/storage corrections.
- If several meals are outstanding, present a compact review list rather than a succession of compulsory dialogs. Later leaves the meal unconfirmed and reservations intact; ask at most once per visit.
- Household confirmation is shared meal state: a member's successful confirmation prevents another member from consuming the same portions again. Allow explicit correction with attribution.
- Passage of time alone does not confirm cooking, consumption, or raw stock deductions. Pending meals and expected batches must be visibly distinct from confirmed balances.
- An actual saved Cook With Me session may establish that a fresh dish was cooked, but not that everybody ate it. The later consumption confirmation reuses that record and cannot deduct ingredients or create batches a second time.
- Users who never open a cooking session can confirm actual cooking/output from the meal review. Do not fabricate guided-session progress, recipe reflection, or quality ratings.
- Raw ingredients are deducted once for the actual fresh batch made; stored prepared portions are deducted once for the actual amount eaten. Review corrections must not overwrite unrelated stock changes.

### Shopping and Pantry

- Prepared-food slots contribute no raw recipe ingredients to shopping and do not deduct raw ingredients again when eaten.
- A fresh side such as rice contributes its own shopping requirements and is included in its meal's combined cooking activity.
- Show prepared meals in a Pantry section with title, storage, remaining/reserved portions, and optional user-entered dates.
- Keep raw ingredient inventory and prepared portion inventory distinct so a cooked curry is not treated as a raw ingredient substitute.

### Meal and preparation times

- Each slot has an editable eating time. Existing meal-time defaults are starting values.
- For fresh dish set F, default meal block length in minutes is `max(prepTime + cookTime for F) + 15`. End the block at serving time and work backwards for its start. Permit an explicit duration/start override; missing timing prompts for a value rather than inventing a duration.
- A suggested cook block ends at eating time; users can move it earlier and account for passive time themselves. Do not claim the entire recipe duration is active hands-on work.
- Ready — frozen dishes have a separately timed defrost reminder event using a saved editable default. V1 assumption: 18:00 on the prior local calendar day, with per-meal override. This is a reminder preference, not an assertion that food will be thawed/safe at serving time. No independent reheat event is generated. Ready — fridge dishes need no defrost event.
- A mixed meal's single preparation/cooking event includes short, user-provided or reviewed reheating notes for its prepared dishes. Proposed default for a prepared-only meal: no main preparation block, but keep required prior defrost reminders.
- Do not infer safe storage life, thawing method, or a mandatory 24-hour defrost instruction.
- One activity such as “Prep & cook dinner — 2 dishes + 1 soup” lists dishes, allocated amounts, fresh/prepared source, station assignments, and high-level reheating instructions, and links to the grouped fresh cook session and individual recipe sessions. Its end is serving time; do not create a second eating event.
- If one cook supplies several meals, schedule its fresh cooking activity once. Later prepared-meal allocations only generate any still-needed defrost reminders.
- Calendar session links must open the specific authorized meal and correct dishes/quantities after login. They must not start timers, consume stock, or mark anything complete merely on link visit.

### Grouped cooking and appliances

- Extend the existing multi-recipe session; keep entry into it optional so cooking/eating offline still works with later confirmation.
- Assign dishes/steps to named stations: microwave, oven, slow cooker, rice cooker, and individual burners such as Stove A/Stove B. Permit custom station names rather than guessing unrecognized dictated names.
- Support independent recipe steps/timers concurrently and expose active station use in the grouped session. Prepared reheating can appear as a short task without pretending it is a new fresh-recipe cook attempt.
- V1 assumption: show longer-running fresh dishes first, independent steps/timers, named station assignments, and resource conflicts. Automatic interleaving/optimizing of every recipe step is a later extension; the session must not claim a fully optimized schedule when recipe step durations/resources are missing.
- If two dishes need the same exclusive appliance simultaneously, surface the conflict and allow a station/time/duration override. The longest-recipe-plus-buffer estimate is a user-chosen default, not proof that every combination is physically possible in that window.

## Shared Google Calendar and two-way time updates — confirmed direction

- A household admin connects Google and creates one dedicated secondary calendar named Mychelin for that household; store the calendar ID and one event mapping per meal/activity. Members opt in to sharing/addition in their own Google Calendar view. Share editing access with opted-in household members so they can drag events; do not create separate copies in their primary calendars or a public calendar.
- Create/update/remove only Mychelin-managed cooking and defrost events as meal plans change; prevent duplicate events during retries. Preserve unrelated manually created events in the dedicated calendar.
- Converting the last fresh dish to prepared removes its managed cooking block, but preserves/updates defrost reminders if frozen portions are still planned. Removing a frozen dish or moving it to a different meal must remove/move any now-obsolete managed reminder without disturbing unrelated calendar events.
- Google sign-in alone does not grant Calendar access; connecting and disconnecting need a clear flow. Initial connection previews shared data and creates/selects the dedicated household calendar explicitly. One connecting account owns the Google calendar; connection loss or that member's departure must show a paused integration and permit explicit reconnection rather than silently changing calendar ownership.
- Google timing edits flow back into Mychelin; details, recipes, portions, and consumption continue to be edited in Mychelin. The common meal identifier maps an incoming change to its whole dish group.
- Offline/provider failure must preserve the plan and show pending/failed sync with retry; external calendar failure must not corrupt portion balances.
- Household membership/Google sharing grants must be checked and revoked on departure/removal. Shared meal titles and planned quantities are visible in the shared calendar, but private recipe histories/transcripts/credentials and unrelated personal batches remain excluded. Calendar links still enforce Mychelin access checks.
- Include watch/credential/sharing teardown in household disconnect and deletion lifecycle, including the existing 30-day recovery flow. Recovery requires an explicit valid reconnection. Do not orphan active credentials/sharing, and do not delete a user's Google calendar as an implicit side effect of losing connection.

### Incoming timing and conflict behavior

- Dragging a cooking event preserves its duration and sets meal serving time to the new event end. Move every dish in the group, keep its meal-type label, and recompute the block/reminders and household portion context. Moving across dates must not leave dishes behind or silently merge with another meal already on that date.
- Resizing is a v1 timing assumption: the new event end is serving time, and the new duration becomes an explicit meal-level override. Invalid or too-short blocks show a timing warning/conflict in Mychelin rather than silently deleting dishes or pretending the work fits.
- Moving a defrost event changes that reminder's override only; it does not shift the meal time. Combine frozen dishes for the same meal into one reminder to limit clutter.
- Apply routine dependent changes automatically: linked future reminder times, calendar descriptions, dish grouping, reservations, and timing calculations. Do not mark food thawed/eaten or consume stock due to a calendar drag or elapsed reminder.
- Identify collisions within the Mychelin meal/calendar model, including appliance occupancy, insufficient preparation windows, unavailable batch portions, changed household blocking, or two incompatible simultaneous edits. Present unresolved conflicts on the affected meal with suggested actions and preserve a consistent stock ledger. Do not silently cancel another meal or substitute dishes.
- Detecting personal-calendar work/meeting conflicts is outside current access scope; only the dedicated Mychelin calendar is synchronized in v1.
- Elapsed defrost reminders stay historical: moving dinner cannot undo physical thawing. Ask for correction where a later schedule conflicts with the user's actual storage state; new reminders must not silently be created in the past.
- V1 assumption for deleting a managed event directly in Google: keep the meal and reservations, mark its calendar activity removed, and offer Restore calendar event or Cancel/reschedule meal in Mychelin. Do not resurrect it immediately or interpret external deletion as having eaten/discarded food.
- Consumed meals retain their historical stock effects; a later external edit cannot consume again or rewrite those effects. Flag historical schedule edits for explicit correction.

### Verified technical mechanism and reliability

Proposed implementation based on official Google documentation:

1. Register an HTTPS event-watch endpoint for the dedicated calendar. Validate the stored channel identity, resource identity, and secret channel token. A change notification is only an invalidation signal; it has no event payload.
2. Fetch changed events using stored incremental sync state, follow every page, and match managed event IDs back to meal/activity IDs. Persist the new sync token only after processing the complete change set.
3. Apply incoming timing changes with per-meal revision checks; detect Mychelin's own acknowledged event updates to avoid an echo loop. Only changed timing fields participate in reverse sync.
4. Make outgoing event writes conditional on Google's event version (`etag`/`If-Match`) so stale updates cannot overwrite a concurrent drag. On version conflict, fetch current values; automatically merge independent changes and route incompatible same-field edits to Mychelin's conflict resolver.
5. Persist pending outgoing work and retry safely, renew expiring watch channels, and run a scheduled incremental catch-up because push delivery can be missed. An invalidated sync token triggers rebuilding the external event cache, never deleting meal/batch data.
6. Use scoped calendar permissions and encrypted stored connection credentials for offline updates. Do not log tokens or share them with household members. Calendar authorization/configuration and credential encryption must be verified before enabling the integration.

References: [push notifications](https://developers.google.com/workspace/calendar/api/guides/push), [incremental synchronization](https://developers.google.com/workspace/calendar/api/guides/sync), [conditional event updates](https://developers.google.com/workspace/calendar/api/guides/version-resources), [calendar sharing](https://developers.google.com/workspace/calendar/api/concepts/sharing). Google documents that sharing access does not automatically add a calendar to a member's calendar list; provide an explicit optional add-calendar step.

## V1 assumptions for review and pilot iteration

- Default defrost reminder is the previous evening at 18:00 local time, editable globally/per meal; group frozen dishes in one reminder. Reserving a frozen serving schedules a reminder unless the user already marked that allocation thawed/ready. Do not infer thaw completion from the reminder; refine physical storage transitions after pilot observation.
- Calendar reverse sync imports timing only. Event text/resource details are generated from Mychelin; arbitrary Google text edits do not change recipe quantities. Deletion/resizing follow the rules above; recurring/all-day conversion is unsupported and surfaced as a conflict.
- Named appliance assignments, simultaneous recipe steps/timers, longest-dish-first display, and conflict checks are the initial coordination scope. A full optimized step scheduler remains a separate future slice.
- Prepared-only meals have no main block; user-reviewed reheating notes and earlier defrost reminders remain accessible from the meal.
- Next-login review groups overdue meals with Yes as planned, Adjust, Didn't have this meal, and Later; it is dismissible and asks at most once per visit.

On 2026-10-15 B explicitly approved proceeding with the recorded defaults, requested small mechanical tasks assigned to the isolated DeepSeek worker, and required Sol verification. Application implementation is authorized. Account connections, live migrations, credential setup, and external calendar sharing still require the actual connection/setup flow; tests must not use production accounts or data.

## Ordered implementation slices

1. Multi-dish meal model and prepared batches: scoped storage, explicit diner count/meal grouping, manual entry, optional batch output, reservations, next-login confirmation/correction, source labels, and shopping exclusion.
2. Meal activities and grouped session: longest fresh prep+cook duration plus 15 minutes, common serving time, one combined fresh block with reheat notes/session links, named appliance/station coordination, and prior defrost events.
3. Shared Google connection and two-way time updates: household calendar/access, cooking/defrost event identity, incoming timing reconciliation, conflict handling, retries/watch renewal, disconnect, and explicit connection preview.

Route implementation to `sol_worker`: this work changes database state, API contracts, portion integrity, and concurrency. Keep one writer per shared area. Main thread reviews diffs and validates each slice. No production migration or deployment until source, data impact, and acceptance checks are reviewable.

## Non-goals for v1

- Transcription changes, nutrition, food-safety predictions, automatic leftover inference, expiry recommendations, and automatic household invitations.
- Guessing how many portions a previous cooking session produced.
- Treating every consumption of stored food as a new cook attempt.
- Arbitrary edits to external calendar events unrelated to Mychelin.

## Definition of done and acceptance checks

1. Six prepared portions can be added without a recipe or cooking session and allocated 2+2+2.
2. Week/month calendar visibly distinguishes all three meal sources without relying on color.
3. Physical/reserved/unallocated balances remain correct through reschedule, removal, consumption, undo, discard, and concurrent allocation.
4. Two chilled plus four frozen portions can coexist under the same cook batch.
5. Prepared curry does not regenerate raw curry shopping needs; separately planned rice does.
6. Two dishes plus one soup can share a meal with individual source labels, explicit diners, and one prep-through-serving activity sized to the longest fresh recipe plus 15 minutes; frozen portions get an earlier defrost event and high-level reheat notes, with no separate reheating block.
7. Export previews preserve action, time, portions, storage label, timezone, and backlinks; arbitrary one-hour blocks and unconditional defrost/prep alarms are removed for this flow.
8. Solo/household isolation holds for reads and every mutation; no recipe access is widened by an optional batch link.
9. Meaningful portion/concurrency/event-generation tests and focused browser coverage pass, along with TypeScript, focused lint, build, and whitespace checks.
10. Preview acceptance verifies the complete pilot journey before production rollout.
11. A meal with fresh recipe durations of 30 and 45 minutes plus frozen soup served at 19:00 produces a 60-minute main block from 18:00 to 19:00, including reheat notes, earlier defrost reminder, and authorized grouped-session links.
12. Next-visit confirmation applies actual consumption exactly once, supports partial/missed meals, and avoids duplicate deductions when a cook session was already saved.
13. Dragging a managed cooking event in Google updates the entire meal group's serving time/date in Mychelin, dependent reminders, and conflicts without duplicates or a sync loop. Resizing/deleting follow the stated v1 behavior and never mutate consumption.
14. Opted-in household members see/edit the same shared calendar events; unrelated personal calendars/events remain untouched. Departure revokes managed sharing and a lost owner connection pauses sync visibly.
15. Lost/duplicate notifications, token invalidation, concurrent Google/Mychelin edits, expired watches, and retried outgoing writes recover without lost meal data or duplicate calendar activities.

## Concrete smoke scenario

- Add Japanese curry: six cooked portions, split two in fridge and four in freezer.
- Schedule two portions for each of three dinners; verify source labels and zero unallocated stock.
- Try allocating a seventh portion; confirm a clear rejection. Test a simultaneous final-portion allocation by two household members.
- Add fresh rice to one dinner; shopping includes rice ingredients and excludes cooked curry ingredients.
- Configure serving at 19:00 and fresh rice with prep+cook duration 30 minutes: verify main block 18:15–19:00, curry reheat notes in its description, earlier curry defrost event, and no separate reheat/meal event. Remove rice and verify only its main cooking block is removed; the curry defrost event remains.
- Plan two fresh dishes (30/45 minutes) plus one frozen soup: all three are visible, duration is 60 minutes including buffer, and the grouped cook session contains the fresh dishes with correct portions. Move serving time and verify both the main event and relative defrost reminder update without duplication.
- Return after the first dinner and confirm it twice; stock decreases only once. Adjust actual consumption, then undo and confirm exact restoration. Test Didn't have this meal and Later without stock deduction.
- Complete a fresh grouped session, then confirm eating on next visit: recipe cooking/stock outputs are not applied twice. A household member's confirmation resolves the same review for other members.
- Move the second dinner; reservation follows. Remove the third; two portions become available.
- Check sync across midnight/timezone boundaries and source/storage edits; verify retry, duplicate prevention, disconnect, and deleted-plan event handling.
- Drag dinner from Tuesday 18:00–19:00 to Wednesday 19:00–20:00 in Google: all its dishes now belong to Wednesday's meal at 20:00; relative future reminders follow and portion reservations are preserved/rechecked. A pre-existing Wednesday meal remains separate and any resource clash appears in Mychelin.
- Race a Google drag with a Mychelin time edit, replay notifications, miss a notification, expire a watch, and invalidate a sync token; confirm no ping-pong, lost stock effects, or deletion of canonical meal data.
- Add the shared calendar to a second opted-in member's Google view and drag from there. Confirm one shared event changes, not separate member copies, and test removal/connection-loss behavior.

## Implementation starting points and trap checks

- Schema/migrations: `app/src/db/schema.ts`, `app/src/db/ensure-schema.ts`, `app/drizzle/`. Use additive migrations; preserve existing plan and recipe rows.
- Planner/API: `components/planner/MealPlanView.tsx`, `app/api/meal-plans/`, `lib/planner-logged-meals.ts`. Existing Cooked/Logged flags are not suitable meal-source fields.
- Pantry/shopping: `components/fridge/FridgeView.tsx`, `app/api/inventory/`, `app/api/shopping-list/route.ts`, household inventory/portions helpers.
- Calendar: `components/CalendarExport.tsx`, `lib/calendar.ts`. Inspect all callers before altering shared calendar event/alarm behavior.
- Consumption must be a scoped atomic operation with idempotent handling; a frontend balance check is insufficient.
- Recipe title/yield changes must not rewrite prepared stock or make its snapshot disappear.
- Preserve unrelated work in the dirty checkout and never run database-backed tests against an unverified default environment.
