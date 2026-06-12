# Mychelin Analytics Guide

Mychelin currently uses first-party, privacy-safe product analytics stored in the app database.

Analytics are intentionally metadata-only. Do not store recipe text, prompts, transcripts, family stories, photo URLs, raw ingredient names, or raw step content.

## Dashboard

Production dashboard:

```text
https://mychelin-sg.vercel.app/admin/analytics
```

API:

```text
/api/admin/analytics
```

Access is gated by login email. Add the operator email to one of these Vercel environment variables:

```text
ANALYTICS_ADMIN_EMAILS
ADMIN_EMAILS
```

Use comma-separated emails for multiple operators.

## What To Watch During Pilot

Review after each pilot session and weekly during the pilot.

### Registered Users And Outreach

The dashboard includes an admin-only registered-users table with:

- user id, name, and email
- signup date and last tracked activity
- onboarding goal/frequency/first capture mode
- privacy-safe 30-day usage counts for capture, planning, shopping, cooking, and version promotion
- latest pilot-feedback stage/rating metadata
- copy-all-emails and individual mail links for pilot follow-up

This is intentionally restricted to analytics admins because email addresses are personally identifiable information. Do not expose this table in ordinary product surfaces.

### Activation Funnel

Watch drop-off across:

- signup
- onboarding
- first recipe
- meal planned
- shopping list
- cook attempt
- promoted version

The most important early question: where does the first user fail before the full loop?

### Capture Quality

Watch:

- `recipe_capture_completed`
- `ai_draft_completed`
- `transcription_completed`
- `conversation_assist_completed`
- provider/model fields
- ingredient and step counts

Use this to identify whether users are relying on paste, URL import, conversation, or Ask Mychelin.

### Cooking Loop

Watch:

- `meal_planned`
- `shopping_list_generated`
- `cook_attempt_created`
- `attempt_promoted_to_version`

The goal is not just recipe creation. The goal is a recipe that gets cooked and improved.

### Pilot Feedback

Watch:

- feedback stage
- rating
- latest qualitative notes

Use comments to explain funnel behavior. Do not rely on event counts alone.

## Privacy Rules

Allowed analytics metadata:

- user email, name, and id inside the admin-only registered-users table
- event name
- user id
- recipe id / book id / meal plan id
- route/source
- provider/model
- counts
- booleans
- coarse size buckets
- timestamps

Not allowed:

- recipe title
- ingredient names
- step text
- prompts
- transcripts
- uploaded media URLs
- family story text
- raw feedback beyond the dedicated pilot-feedback table

## Before Inviting Pilot Users

Run the privacy smoke test:

```bash
cd /home/cluser/projects/mychelin/app
MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app npm run smoke:privacy
```

Run the pilot core-loop smoke test:

```bash
cd /home/cluser/projects/mychelin/app
MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app npm run smoke:pilot
```

Optional cleanup of synthetic users, if Turso credentials are available in the shell:

```bash
cd /home/cluser/projects/mychelin/app
MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app \
MYCHELIN_CLEANUP_USERS=1 \
TURSO_DATABASE_URL=... \
TURSO_AUTH_TOKEN=... \
npm run smoke:privacy
```

Expected outcome:

- all assertions pass
- synthetic recipes/books/meal plans are deleted by API cleanup
- synthetic users are deleted only when `MYCHELIN_CLEANUP_USERS=1` and Turso credentials are supplied

## Future Enhancements

- Cohort filter by signup week
- Source filter for onboarding goals and first capture route
- CSV export for pilot notes
- Failed capture/error event tracking
- A/B comparison for onboarding length and first-recipe route selection
