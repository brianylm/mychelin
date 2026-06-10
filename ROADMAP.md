# Mychelin Roadmap

Mychelin's roadmap is about making family food heritage capture trustworthy, practical, and respectful of privacy.

## Near term

### AI recipe capture

- Turn conversations, pasted notes, rough instructions, and scanned recipe photos into structured recipes.
- Ask clarifying questions for missing timings, quantities, substitutions, and sensory cues.
- Preserve uncertainty instead of hallucinating precision where family cooks say "agak-agak".

### Dialect, multilingual, and realtime translation support

- Improve capture for Singapore family language mixes: English, Mandarin, Malay, Tamil, Hokkien, Teochew, Cantonese, Hakka, Hainanese, and Peranakan/Nyonya vocabulary.
- Support live conversation assistance while a family cook narrates: near-realtime transcription, lightweight translation, and suggested follow-up questions so the learner can stay in the conversation.
- Preserve side-by-side original phrasing and translated cooking instructions so family terms, sensory cues, and cultural context are not flattened.
- Add reviewer flows so families can correct AI transcription/translation before the generated recipe becomes definitive.
- Treat full realtime translation as a core product capability. Initial implementation now tries OpenAI Realtime transcription first, falls back to browser live captions when OpenAI Realtime is unavailable, then falls back to chunked OpenAI/Gemini transcription. Text reasoning uses DeepSeek first when configured. It still needs real-audio pilot validation for dialect accuracy, latency, and speaker labeling.

### Conversation facilitation

- Turn record-conversation from passive capture into an active helper: listen for missing quantities, timings, heat levels, sensory cues, substitutions, and family-specific terms.
- Suggest respectful questions the learner can ask during the conversation, e.g. how hot, how long, what should it smell like, what can be substituted, and what mistakes to avoid.
- Keep the older family cook experience calm: no noisy interruptions, no pressure to speak in a formal recipe format, and no requirement to read the screen.
- Store raw transcript, translated transcript, AI-suggested questions, accepted answers, and final recipe extraction as separate artifacts where needed.

### Voice and consent controls

- Make voice recording flows clearer on mobile.
- Add privacy/consent affordances before recording or sharing audio.
- Separate raw recordings, transcripts, and public recipe text in the UI and data model where needed.
- Prefer OpenAI Realtime speech-to-text for live captions, browser live captions as a no-key production fallback, OpenAI request/response transcription for backup chunks, DeepSeek V4 Flash for text reasoning, and Gemini only as an optional fallback where dialect audio handling needs it.

### Pilot operations

- Prepare a small pilot runbook covering signup, first recipe capture, first meal plan, shopping-list generation, cook-with-me, attempt notes, and version promotion.
- Collect privacy-safe feedback after the first capture, first cook session, and first promoted version. Initial implementation covers first capture, first cook, and general pilot feedback; first promoted-version feedback remains a follow-up.
- Define pilot success metrics around completed core loops, transcript correction burden, recipe quality, and whether users feel more confident cooking the dish again.
- Maintain synthetic demo data and smoke-test scripts for auth, recipe capture, meal planning, shopping list, cook-with-me, attempts, versions, sharing, and permissions before inviting pilot users.
- Review usage analytics weekly during the pilot, especially activation drop-offs, failed captures, AI fallback rates, repeat cooking behavior, and qualitative feedback notes.

### Activation, training, and habit loop

- Use onboarding to capture a user's first goal: learn to cook, cook regularly, save family recipes, plan meals, or reduce waste.
- Translate onboarding frequency into a forgiving weekly cooking goal, then show progress in Profile so the habit loop feels like a practical rhythm rather than daily guilt.
- Bias the first session toward a fast magic moment: one messy family recipe becomes one usable cookable recipe.
- Add a first-recipe guided mission that trains the Mychelin loop through action: capture/create a recipe, plan it, generate a shopping list, cook with me, record an attempt, and promote useful changes into a version.
- Add a sample recipe sandbox so new users can safely practice planning, shopping-list generation, cook-with-me, attempts, and version promotion without risking their own recipes.
- Add contextual coach tips only at useful moments, e.g. empty recipe, planned meals, shopping-list generation, cook-session completion, and version promotion. Avoid generic modal tours and permanent banners.
- Add a replayable Learn Mychelin area under Profile for recipe capture, meal planning, shopping list, cook-with-me, and attempts/versioning walkthroughs.
- Keep improving the first-draft recipe prompt flow: users can ask Mychelin to create specific recipes they want to try, then save them as editable first drafts before cooking/refining. Prefer DeepSeek v4 Flash for structured text drafting, conversation assist, and recipe extraction when configured; keep OpenAI speech-to-text for audio transcription.
- Treat Duolingo-style stickiness as a low-friction cooking loop, not points for their own sake: one small cooking promise, one first recipe, one attempt, one improvement.
- Use PWA notifications for practical prompts: planned meals, prep windows, weekly rhythm nudges, and post-cook review reminders. Keep payloads privacy-safe and avoid recipe/transcript detail in push copy.
- Keep the habit threshold forgiving. A cooking streak should reward showing up without punishing real-life missed days or pushing users to cook daily when weekly cooking is the healthier goal.

### Sharing and permissions

- Strengthen family recipe-book invitations.
- Clarify private vs shared recipes.
- Add tests around auth, recipe access, and invitation boundaries.

## Medium term


### Planning and calendar workflows

- Extend Send to Calendar so planned dishes can generate prep events before cook day, e.g. marinade or soak reminders on D-2 plus the actual cook event on D-day.
- Let recipes store prep lead-time requirements separately from active cooking steps so calendar exports can schedule the right reminders without cluttering cook-with-me.

### Mobile PWA polish

- Improve install prompts, offline states, and kitchen-mode interactions.
- Tune touch targets, loading states, and accessibility for seniors and one-handed cooking use.

### Import workflows

- Add a dedicated Scan recipe photo/OCR capture path under Create recipe, separate from Import URL and Paste recipe text.
- OCR MVP flow: upload or take a photo, extract text, show editable OCR text for correction, then send the confirmed text through the existing paste parser to produce recipe fields.
- Import handwritten recipe cards, cookbook pages, WhatsApp screenshots, and old family photos.
- Use a vision/OCR provider for image-to-text; keep DeepSeek focused on text reasoning and recipe extraction after OCR text is available.
- Make image retention explicit: allow OCR without storing the source image, or preserve the original image as provenance when the user chooses it.
- If provenance images are stored, revisit private/signed media delivery because current Vercel Blob URLs are gated by discovery but public to anyone with the exact URL.
- Support source URLs for recipes adapted from online references.

### Demo and documentation assets

- Add privacy-safe screenshots and demo data.
- Document a guided "capture Ah Ma's recipe" flow for heritage partners and reviewers.
- Build pilot-user training scripts around the core loop: first recipe, first meal plan, first shopping list, first cook session, first attempt, and first promoted version.

## Long term

- Community heritage capture kits for workshops and schools.
- Curated export formats for family cookbooks and archive submissions.
- Sustainable hosted model that keeps the preservation mission accessible while covering infrastructure and AI costs.

## Good first issue areas

- Accessibility audits and fixes
- Privacy-safe sample data
- Tests for auth/share/privacy boundaries
- PWA offline and install-flow polish
- Documentation for local setup and deployment assumptions
