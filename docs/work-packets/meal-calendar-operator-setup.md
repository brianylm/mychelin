# Meal calendar pilot — operator setup

Implementation is under verification. This checklist is not evidence of a deployed or connected integration. No live migration, Google authorization, calendar creation, or sharing is authorized by running the local tests.

## Configuration

Keep Calendar consent separate from normal Mychelin sign-in. Enable the Google Calendar API in the intended Google Cloud project and configure an OAuth web client and consent screen for the pilot accounts.

| Variable | Purpose |
| --- | --- |
| `MEAL_CALENDAR_ENABLED` | Set to `true` only after the remaining configuration and schema are ready. |
| `GOOGLE_CALENDAR_CLIENT_ID` | Dedicated Calendar OAuth client. |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Server-only OAuth secret. |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Exact registered HTTPS callback ending `/api/meal-calendar/callback`. |
| `MEAL_CALENDAR_ENCRYPTION_KEY` | Server-only 32-byte key encoded as 64 hexadecimal characters or base64/base64url; retain it across deployments so stored credentials remain decryptable. |
| `GOOGLE_CALENDAR_WEBHOOK_URL` | Public HTTPS endpoint ending `/api/meal-calendar/webhook`. |
| `MEAL_CALENDAR_SYNC_SECRET` | Independent high-entropy secret for the authenticated sync runner. |
| `NEXT_PUBLIC_BASE_URL` | Correct application origin for meal/cook-session links in events. |

Do not commit environment values or put credentials in browser-visible configuration, logs, issue descriptions, or event descriptions.

The Calendar connection requests `openid`, `email`, `calendar.app.created`, and `calendar.acls`. These are not added to normal sign-in. The app-created scope supports secondary-calendar/event operations; ACL scope supports optional household sharing and grants broader calendar permission-management capability. Mychelin must still restrict every operation to the connected, app-created secondary calendar. See Google's [calendar creation scopes](https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert) and [ACL scopes](https://developers.google.com/workspace/calendar/api/v3/reference/acl/insert).

## Rollout gates

1. Back up the intended database and review the additive `0032_meal_pilot_foundation.sql` migration against the actual schema. Applying it is a separate authorized rollout step; do not use the production database as a test fixture.
2. Verify the unit, transaction, calendar-mock, build, and desktop/mobile browser gates recorded in `meal-pilot-execution.md`.
3. Configure an external scheduler to call `POST /api/meal-calendar/sync` with `Authorization: Bearer <MEAL_CALENDAR_SYNC_SECRET>` regularly. Notifications enqueue work; durable jobs still need a runner. Confirm the final runner also enqueues periodic catch-up and expiring-watch renewal before enabling it.
4. Have a household admin explicitly connect Google Calendar from Mychelin. Check that one private secondary Mychelin calendar is created, rather than events in a primary calendar or separate per-member copies.
5. Have each interested member opt in to the same calendar. Verify the resulting access and Google visibility with pilot accounts. Household removal and disconnect must revoke/pause as designed; verify these before inviting real household members.
6. Perform the two-way test: fresh meal plus frozen dish, longest fresh recipe +15-minute block ending at serving, separate prior defrost reminder, Google drag reflected in Mychelin, and a concurrent-edit conflict surfaced without stock changes.

Google watches expire and must be renewed. Missed notifications require incremental catch-up, including recovery from an invalid sync token. See Google's [push notification guide](https://developers.google.com/workspace/calendar/api/guides/push) and [incremental synchronization guide](https://developers.google.com/workspace/calendar/api/guides/sync).

## Pilot defaults

- Fresh dishes share one preparation/cooking block. Prepared-only meals do not create an inconsequential reheating block.
- Frozen dishes get a separate reminder at 18:00 on the preceding local day unless explicitly adjusted. This is an editable planning default, not a guarantee that a particular dish will be safely thawed by serving.
- Meal confirmation, not elapsed time or a Google drag, applies stock consumption.
- Unsupported all-day/recurring edits and concurrent revisions require resolution in Mychelin. Deleting a Google event must not delete a meal or consume stock.

Scheduler cadence, deployment configuration, production migration, and live account acceptance remain rollout responsibilities until explicitly recorded as completed.
