# Mychelin Pilot Runbook

Use this runbook while feature progress is paused and the product is being readied for pilot users.

## Pilot Goal

Validate whether Mychelin helps a moved-out homecook capture one family recipe, plan it, shop for it, cook it with guidance, and improve it through an attempt/version loop.

The pilot is not a feature showcase. Keep each participant focused on the core loop.

## Pre-Pilot Gates

- Production deploy is current: `https://mychelin-sg.vercel.app`
- Privacy smoke test passes:

```bash
cd /home/cluser/projects/mychelin/app
MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app npm run smoke:privacy
```

- Core pilot-loop smoke test passes:

```bash
cd /home/cluser/projects/mychelin/app
MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app npm run smoke:pilot
```

- Admin analytics access works at `/admin/analytics`.
- Known AI env vars are configured for the routes being tested:
  - `DEEPSEEK_API_KEY` for text reasoning and recipe extraction
  - `OPENAI_API_KEY` for transcription/realtime speech paths
  - optional `GOOGLE_API_KEY` / `GEMINI_API_KEY` only where fallback is expected
- The tester understands that shared links are public to anyone with the token.
- The tester understands uploaded photo/voice blob URLs are not discoverable through the app without access, but are public if someone has the exact URL.

## Participant Script

### 1. Signup and Onboarding

Ask the user to create an account and complete onboarding.

Observe:

- Can they complete onboarding without explanation?
- Do the selected goals match why they are using Mychelin?
- Do they understand the weekly cooking rhythm?

### 2. First Recipe Capture

Ask the user to add one real recipe through the most natural route:

- Live conversation, if they are with a family cook
- Paste recipe text, if they already have notes/messages
- Import URL/video, if they are adapting an online recipe
- Ask Mychelin, if they want a first draft
- Manual recipe, if they want full control

Observe:

- Which route do they choose without prompting?
- Do they understand that the first output is editable?
- Are ingredients and steps good enough to cook from?
- How much correction is needed?

### 3. Meal Plan

Ask the user to plan that recipe for a real upcoming meal.

Observe:

- Can they find the recipe from meal planning?
- Does date/meal segment selection make sense?
- Do they understand recipes can be cooked from the meal plan?

### 4. Shopping List

Ask the user to generate a shopping list for the planned date range.

Observe:

- Is the list useful enough to shop from?
- Are quantities/units confusing?
- Are missing pantry/fridge assumptions obvious?

### 5. Cook With Me

Ask the user to start Cook with me from the planned meal.

Observe:

- Can they follow the steps while cooking?
- Are timers visible and audible enough?
- Is multi-dish cooking needed for this participant?
- Do they know how to exit safely?

### 6. Attempt Notes

At the end of cooking, ask the user to rate the dish and capture:

- what worked
- what changed
- what should be done next time
- whether the dish felt closer to home

Observe:

- Do they understand this is an attempt, not a new version?
- Are half-star ratings clear?
- Are next-time notes easy to enter?

### 7. Promote Useful Changes

If the attempt contains meaningful improvements, ask whether they want to promote it to a version.

Observe:

- Do they understand `promote to version`?
- Do they understand `set as definitive`?
- Do they trust the recipe more after the attempt/version loop?

## Interview Questions

Ask after the task, not during the task.

- What part felt most useful?
- What part felt confusing or too much work?
- Would you use this again before cooking next week?
- Did Mychelin reduce the mental load of homecooking?
- Did the recipe feel more reliable after the cooking attempt?
- Would you ask a parent/grandparent to use the conversation capture flow?
- What would stop you from using this regularly?

## Success Metrics

Track both behavior and sentiment.

- Signup completed
- Onboarding completed
- First recipe captured or created
- Recipe edited after capture
- Meal planned
- Shopping list generated
- Cook with me started
- Cook attempt created
- Attempt promoted to version
- User says they feel more confident cooking the dish again

## Known Risks To Watch

- Conversation capture latency or transcription failure
- AI extraction creating overconfident wrong details
- Recipe steps too clumped for cook-with-me timers
- Users choosing Books before creating recipes
- Users missing the difference between attempts, versions, and definitive version
- Public share links being misunderstood as private invitations
- Uploaded media privacy expectations exceeding current blob behavior
