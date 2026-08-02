# Work Packet — AI Photo Beautify + Shareable Recipe Image Card

Status: implemented 2026-07-30 (preview acceptance pending)
Owner: Agrippa + B

## Product intent

User-uploaded dish photos get repainted as warm painterly illustrations (landing-hero style) via the Gemini image model, and the public shared-recipe page becomes a shareable recipe card: AI hero image, cooking-card ingredient×step table, and a signup CTA that survives PNG export.

## Decisions (locked with B)

- **Trigger**: auto-beautify the cover photo when a recipe is shared (`POST /api/share/[token]/beautify`, token-gated, idempotent) + a Beautify button per photo in the app gallery (`POST /api/recipes/:id/photos/:photoId/beautify`, edit permission).
- **Style**: landing-hero painterly (warm oil-painting, no text/watermark, dish stays recognizable). Prompt lives in `src/lib/ai-image.ts`.
- **Storage**: generated variants are extra `recipe_photos` rows (`source: "generated"`, `source_photo_id` → the upload). Originals untouched; originals remain the canonical cover source (`recipe-photo-display.ts` never picks generated rows as cover).
- **Share card**: public `/shared/[token]` recipe view restyle behind `SHARED_RECIPE_CARD_ENABLED` (kill switch; classic layout is the fallback). Book drill-in keeps the classic detail view for now.
- **PNG export**: "Save as image" on the shared card, via `src/lib/export-node-png.ts` (extracted from CookingCardExport, which now uses it too). The CTA banner (with printed URL) stays in the PNG; the button itself is stripped.
- **Provider**: Gemini image model (`gemini-2.5-flash-image`, fallback `gemini-2.0-flash-preview-image-generation`), key path shared with ai-extract (`GOOGLE_API_KEY || GOOGLE_AI_API_KEY || GEMINI_API_KEY`). 25s timeout (edge wall clock), one retry on 429/5xx.
- **Progressive enhancement**: no photos → no hero, no beautify call; provider/key/timeout failure → original photo stays, public page never errors.

## Deviations / known edges

- Generated variants of the *cover* only auto-generate on share; other photos are beautified manually in-app.
- `SaveRecipeButton` copies `imageUrl` but not photo rows — saving a shared recipe does not carry the generated illustration (original behaviour for photos too).
- Deleting the cover upload leaves `recipes.imageUrl` dangling (pre-existing); generated variants are independent rows and keep working.
- No quota/rate limiting beyond idempotency per photo; revisit if share links get hammered.

## Rollback

- Shared-page restyle: flip `SHARED_RECIPE_CARD_ENABLED` to false (classic layout returns).
- Whole feature: `git revert` the two phase commits; `recipe_photos.source`/`source_photo_id` columns are additive and harmless if left.
