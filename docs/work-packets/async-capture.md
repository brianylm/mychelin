# Work Packet Draft — Async Capture (voice note / photo now, structure later)

Status: NOT READY — open decisions below must be grilled with B before any code.
Owner: Claude + B
Source: tester onboarding review, 2026-11-21 ("adding a recipe is a project, not a habit").
Related: `scan-recipe-photo-ocr.md` (overlaps slice 3; merge or supersede when grilled).

## Product intent

Let a user add a family recipe in about 10 seconds and structure it later. Today every real family
recipe needs a live narrator or a full manual dump.

## Hard constraints

- AI must not bill (B, 2026-11-21): free-tier Gemini for audio/image to text, prepaid DeepSeek for
  structuring. `lib/ai-cost-policy.ts` blocks OpenAI/MiniMax.
- Prod free-tier quota is tiny (2.5-flash 20 req/day, 3.5-flash 5/min, 3.5-flash-lite primary).
- The raw capture must survive any AI failure and stay playable/viewable.

## What exists (prod-2026-11-21c)

- `api/recipes/[id]/voice` stores clips in Vercel Blob (`access: "public"`), always named `.webm`,
  no type/size check, no transcription.
- Live conversation transcribes 10 s chunks via Gemini inline_data; full audio is not kept.
- `lib/ai-image.ts` already sends images to Gemini as inlineData (photo beautify). No OCR exists.
- `api/capture/paste` → `lib/ai-extract.ts` (DeepSeek first, Gemini fallback); `manual-recipe-parser.ts`
  is a free rule-based fallback.
- Uploads pass through the function, so the 4.5 MB body limit applies. No client-direct upload yet.
- `recipes.status` is `active | draft`; 16 call sites assume only those two values.
- `lib/recipe-promotion.ts` promotes a draft to active once it has a real title, even with no content.

## Proposed design

- New table `recipe_captures` (migration 0034, additive): recipe_id (cascade), user_id, kind
  (audio/image), blob_url, mime_type, bytes, duration_sec, state
  (saved/transcribed/structured/failed/private), raw_text, error_code (quota/unavailable/unparseable),
  attempts, last_attempt_at, model, ai_consent_at, created_at.
- Recipe stays `status: "draft"` titled e.g. "Voice note · 21 Nov". No new status value.
  Promotion skips drafts with an unstructured capture.
- Client-direct upload to Blob (`@vercel/blob/client` token route). Caps proposed: audio 15 MB /
  10 min; images resized client-side to ≤ 2 MB, ≤ 4 pages.
- Processing only on user action: "Structure now" button, plus one auto-try on opening a saved/failed
  draft ≥ 10 min after the last attempt. One Gemini call per file. Raw text checkpointed, then
  DeepSeek structuring, then `RecipeCaptureReview` confirm.
- Quota/429 → `failed/quota`, "Saved. Your voice note is safe. Try again later." + Retry +
  "Type it myself". Per-user daily processing cap via `lib/rateLimit.ts`.

## Slices (value order)

1. Capture and keep (M, strong worker: schema, storage, privacy). No AI.
   Accept: 15 MB `.opus` and 6 MB photo save; capture plays/shows after reload; stays draft after rename.
2. Voice to recipe (M). Process route + consent + transcript edit + review + quota/retry/cap.
   Accept: mocked 429 → failed/quota with audio intact; Retry succeeds; structured result promotes.
3. Photo OCR (S–M). Same pipeline, OCR prompt, resize, multi-page, editable OCR text.
4. Polish (S–M). Auto-retry on open, PWA `share_target` (WhatsApp share-in), per-capture
   "keep private, never send to AI".

## Open decisions for B (grill before code)

1. Consent copy. Free-tier Gemini may use inputs to improve Google products and human reviewers may
   read them (general knowledge, verify current terms). Per-capture consent naming Google, or default
   private with AI opt-in? The live-conversation copy has the same gap today.
2. Public Blob URLs for family audio and handwriting: accept, or move to private/signed first?
3. Size caps and retention (15 MB / 10 min / 4 pages proposed; Blob storage cost beyond free tier).
4. Per-user daily processing cap (number).
5. Free in-browser OCR fallback (Tesseract.js: private, weak on handwriting and Chinese): yes or no?
