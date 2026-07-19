# Work Packet Draft — Scan Recipe Photo / OCR Import

Status: ready for extended Codex session
Owner: Agrippa + B
Source roadmap item: Mychelin ROADMAP.md → Import workflows → Scan recipe photo/OCR capture path

## Product intent

Make it easy for people just starting to cook at home to import recipes into Mychelin from photos, screenshots, WhatsApp downloads, recipe books, and handwritten recipe notes — not only family recipes.

The wedge is low-friction recipe ingestion: users should be able to turn a messy real-world recipe image into editable text, then into a structured Mychelin recipe draft.

## Target user

Beginners / early home cooks who want to learn and cook from:

- family recipes
- recipe books
- screenshots
- WhatsApp/shared images
- handwritten recipe notes/cards

## MVP input scope

Day 1 supports:

- photo upload from gallery/downloads
- screenshot upload
- WhatsApp-downloaded image upload
- handwritten text image upload, best-effort OCR
- opening the camera from inside the app to snap a recipe photo

Day 1 explicitly excludes:

- PDF import
- storing original source images
- full provenance image archive

## Post-OCR flow

Chosen flow:

1. User selects/takes image.
2. Mychelin extracts OCR text.
3. User sees editable OCR text.
4. User confirms/corrects text.
5. Confirmed text is sent through existing paste/text recipe parser.
6. Parser creates an editable draft recipe.

## Image retention

Mychelin does **not** store the original image for this MVP. The image is used transiently for OCR only, then discarded.

## UX placement and copy

Add **Scan recipe** to the existing Add/Create recipe menu alongside:

- Import URL
- Paste text
- Live conversation
- Ask Mychelin
- Manual scratch pad

CTA label: **Scan recipe**

Helper meaning: scanning can use either an existing image or a new image from the camera.

## Definition of done — v1

Codex is done when:

1. Add/Create recipe has a **Scan recipe** entry point.
2. User can choose an existing image or open the camera to take a new photo.
3. Image is used transiently for OCR and is not stored.
4. Extracted OCR text appears in an editable review screen.
5. User confirms/corrects OCR text.
6. Confirmed text flows into the existing paste/text recipe parser and creates an editable draft recipe.
7. Failure states are handled for blurry/no text, provider failure, unsupported/too-large file, and parser failure.
8. Privacy copy clearly says images are used only to extract text and are not stored.
9. The implementation passes the smallest meaningful validation gate and is deployed for UI testing.

## OCR provider policy

Use whatever Mychelin already has configured; do not add a new vendor unless absolutely blocked.

Current repo reality:

- Text recipe extraction: DeepSeek first via `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`, with Gemini/MiniMax fallback in `app/src/lib/ai-extract.ts`.
- Speech/realtime transcription: OpenAI via `OPENAI_API_KEY`, default realtime model `gpt-realtime-whisper`, batch model `gpt-4o-transcribe`.
- Multimodal/audio fallback: Gemini via `GOOGLE_API_KEY` / `GOOGLE_AI_API_KEY` / `GEMINI_API_KEY`, currently using `gemini-2.5-flash` for chunk transcription.

Preferred OCR implementation path for Codex to inspect/use:

1. Reuse an existing configured multimodal provider, likely Gemini `gemini-2.5-flash`, for image-to-text OCR if the key is available.
2. If Gemini is unavailable but OpenAI vision-capable APIs are available through the existing `OPENAI_API_KEY`, use the simplest OpenAI vision OCR path.
3. After OCR, reuse existing text recipe extraction instead of building a separate recipe parser.
4. Do not persist the image.

## File limits and continuation behavior

- Max image size: **10MB** for v1.
- Supported formats: **jpg, png, webp, and heic if the browser/runtime provides it**.
- If OCR quality is poor, the user can continue by editing the extracted text before parsing.
- Do **not** create a separate OCR note object. The editable OCR screen is an intermediate step only.

## Remaining implementation questions for Codex to resolve by repo inspection

- Exact route/component names.
- Whether existing Add/Create recipe menu already has a clean extension point.
- Whether Gemini image OCR is available through existing env/config; otherwise use OpenAI vision through existing `OPENAI_API_KEY` if feasible.
- Final error/privacy copy, consistent with current UI tone.
- Validation commands and deployment target.
