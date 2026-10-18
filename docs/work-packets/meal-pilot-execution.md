# Meal pilot execution — 2026-10-15

Source of truth: `cooked-batches-meal-plan-calendar.md`. B approved implementation, small DeepSeek tasks, and Sol verification.

## Working boundaries

- Main thread owns product decisions, integration, checks, and this execution record.
- Sol owns architecture, migrations, API/ownership contracts, stock transactions, credentials, two-way synchronization, and final review.
- DeepSeek owns one bounded mechanical task at a time with explicit file ownership and exact acceptance checks. Stop if scope expands; escalate after two failed correction attempts.
- Preserve pre-existing hero/session edits and memory entries. Do not commit/push/deploy from worker tasks. No production database/calendar testing.
- Baseline before work: 192 unit tests and TypeScript passed; existing checkout is dirty with unrelated deployed hero/session changes.

## Task queue

| ID | Task and acceptance | Owner | State |
| --- | --- | --- | --- |
| A0 | Establish stable types, additive data model, transaction/sync boundaries and small downstream contracts | Sol | Types written; boundaries accepted |
| D1 | Pure longest-fresh-prep+cook+15 helper; explicit override, missing timing, no prepared-only block; focused tests | DeepSeek | Parent reviewed; 8/8 focused tests passed |
| A1 | Additive meal/batch/reservation persistence with scoped, atomic mutations and legacy isolation | Sol | Schema, service, group/batch/list/add APIs written; confirmation/transfer/transactions tests in progress |
| D2 | Presentational source labels and meal timing/diner fields against stable props | DeepSeek | Components written and Sol reviewed; accessibility correction running |
| D3 | Prepared batch entry/list components against exact props and API contract | DeepSeek + Sol integration | Corrected entry form reviewed and lint passed; mounted prepared list pending |
| D4 | Overdue meal review component: as planned, adjust, missed, later | DeepSeek + Sol integration | Dialog reviewed; adjustment form running; authenticated controller pending |
| A2 | Integrate planner grouping, correct dish quantities, shopping exclusion, and confirmation ledger | Sol | Backend mutations and separate scoped frontend integration running |
| D5 | Calendar event descriptions and visible cooking/defrost summaries using established event contract | Sol | Folded into calendar foundation to keep timing/event contracts together; parent reviewed draft |
| D6 | Named cooking-station controls and conflict display within existing multi-cook session | DeepSeek + Sol integration | Controlled station fields written, parent reviewed and lint/typecheck passed; server/controller integration pending |
| A3 | Separate Google connection, encrypted credentials, shared calendar and permission lifecycle | Sol | Implementing in disjoint calendar module |
| A4 | Durable outbound work, event mappings, inbound time changes, retries/watch renewal and conflicts | Sol | After A3 |
| D7 | Calendar connection/status/conflict UI against approved contracts | DeepSeek | Status component written/lint passed; parent corrected error precedence/redaction; mounting pending |
| V1 | Focused behavior tests per task; inspect every worker diff and typecheck integration | Main + Sol | Parent timing/domain 13/13; intermediate full suite 205/205 and TypeScript passed; later integration still requires rerun |
| V2 | Full isolated suite, build/lint, mocked desktop/mobile browser scenario, final Sol review and operator setup notes | Main + Sol | Final gate |

Subtasks will be split further when a row covers more than one small component or endpoint. D tasks must not make architectural, ownership, or stock-integrity choices.

## 2026-10-17 calendar wiring fixes

Audit found the calendar module written but not connected. Fixed (main thread):

- Every meal mutation route (create, update, fresh/prepared dish add/update/remove, stations, confirm, undo) now calls `requestMealCalendarSync` after commit. Enqueue failures are logged, never fail the user's change; the next edit of that meal repairs a missed enqueue.
- Meal deletion queues `delete_event` jobs inside the deleting transaction (`queueMealCalendarRemoval`) because the cascade removes the activity mappings. The Google event id travels in the job dedupe key (no payload column).
- Member leave/removal and household deletion (`handleMemberDeparture`, `DELETE /api/households`) queue share revocation / connection teardown.
- The runner now executes `teardown_connection`, `unshare` and `delete_event` jobs — previously rejected as unsupported — before the owner-membership and paused-status guards, which would otherwise block exactly these jobs. Teardown revokes pending-revocation shares too and treats 404/410 from Google as done.
- Tests: `meal-calendar/runner.test.ts` (5).

Still open: a Google drag that moves the meal should move the dependent defrost reminder — verify in the two-way test; transfers between fridge/freezer lots do not re-sync affected meals.

## Required pilot proof

- Six cooked portions split fridge/freezer and allocated 2+2+2; reject excess and concurrent double allocations.
- Meal for two with multiple fresh dishes plus frozen soup; source labels and quantities agree across planner, shopping, and grouped cooking.
- Longest fresh recipe 45 minutes creates a 60-minute block ending at serving; defrost event is separate and reheating notes are in the main event.
- Next-visit confirmation applies actual quantities once, supports adjustment/missed/later, and never double-deducts after a saved cook.
- One shared Google calendar receives cooking/defrost activities. A Google drag moves the meal and dependent future reminders; duplicates/races/lost notifications remain recoverable.
- No unconfigured Google connection claims to be connected. Surface required operator configuration honestly; never create live events or share account data during tests.
