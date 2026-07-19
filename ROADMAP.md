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
- Clarify private vs shared recipes. Initial rule shipped: public recipe shares expose the definitive recipe snapshot only; attempts, next tries, private ratings, meal plans, and owner metadata stay private.
- Add tests around auth, recipe access, and invitation boundaries.

## Medium term

### Recipe refinement and heritage field ergonomics

- Clarify the cooking model in product language and UI: an attempt is one cooked session/log, a version is a reusable recipe snapshot, and the definitive version is the one shown/cooked by default.
- Add a structured Cook with Me change editor: edit existing ingredient quantity/unit/name, step content, heat, and timing during the session; save those as the attempt snapshot; then choose whether next-time changes become a candidate version. Initial implementation now captures structured this-cook snapshots and private next-try drafts from Cook With Me.
- Replace free-text-only next-time notes with ingredient/step edits where possible, while still allowing a short reflection field for sensory notes and family context. Foundation shipped: private next tries can be saved from attempts, then promoted to a version and optionally set definitive.
- Introduce explicit Edit/Save mode on recipe core sections after initial creation so users do not accidentally change accurate recipes while reading or cooking. Initial implementation now opens existing recipes in reading mode and keeps new/draft recipes editable.
- Simplify the recipe page so the main path stays focused on title, photos, ingredients, steps, timing, and cookability.
- Move Heritage & Family into progressive prompts instead of a dense form: who taught it, when it is cooked, original dialect terms, sensory cues, and family story can be captured gradually.
- Redesign versions/refinement as an improvement journal: what changed this attempt, what should change next time, whether it got closer to home, and a clear promote-to-version action.
- Make fields feel explicit and inviting with one-question cards, examples, saved-state feedback, and optional prompts rather than intimidating blank sections.

### Nutrition estimates and fitness tracker export

- Explore opt-in nutrition estimation for recipes using ingredients, quantities, yield/servings, and cooking method to estimate calories, protein, carbohydrates, fat, and key uncertainty ranges.
- Treat nutrition as an estimate, not a definitive health claim: show assumptions such as portion size, oil absorbed, sauce/gravy retained, ingredient brand, and whether quantities are approximate/agak-agak.
- Build the model around recipe-level and attempt-level nutrition: recipe baseline, per-serving estimate, and post-cook adjustments when the user records substitutions, leftovers, or actual servings eaten.
- Prioritize Singapore home-cooking edge cases: shared dishes, family-style portions, braises/soups where liquid may not be fully consumed, deep-frying/oil absorption, hidden sugar/salt in sauces, and hawker-style ingredient ambiguity.
- Export path sequencing: start with Mychelin-owned nutrition summary and CSV/copyable meal log; then evaluate Apple HealthKit on iOS and Android Health Connect for native nutrition writes; treat direct MyFitnessPal integration as partner/API-dependent unless a supported public write API is confirmed.
- Keep this separate from Mychelin's heritage/cookability scoring. Do not let calorie or macro estimates become the primary recipe quality signal.

### Planning and calendar workflows

- Add timeframe-aware meal-plan randomisation: users can randomise open meal slots by selected scope — meal, day, week, or month — instead of only rerolling one meal at a time.
- Before randomising a day/week/month, let users block out known-unavailable meal slots, e.g. skipped breakfasts, planned eating out, travel, or already-decided meals.
- Model meal-plan slot states explicitly: `open`, `blocked/skipped`, `eating out`, and `locked/chosen`; randomisation should only fill `open` slots and preserve locked/blocked context.
- Keep blocked slots reversible and visible so the plan explains itself instead of silently deleting meals.
- Extend Send to Calendar so planned dishes can generate prep events before cook day, e.g. marinade or soak reminders on D-2 plus the actual cook event on D-day.
- Let recipes store prep lead-time requirements separately from active cooking steps so calendar exports can schedule the right reminders without cluttering cook-with-me.

### Mobile PWA polish

- Improve install prompts, offline states, and kitchen-mode interactions.
- Tune touch targets, loading states, and accessibility for seniors and one-handed cooking use.

### Import workflows

- Product-discovery lesson from Mela-style personal cookbook apps: the category can still win when ingestion and in-use cooking flow are dramatically cleaner than generic recipe storage.
- Do not copy Mela's Apple-native/RSS wedge wholesale for MVP. Borrow the principle instead: capture from conversation, URL, paste, OCR/photo scan, manual scratchpad, and share-style entry points must feel low-friction and trustworthy.
- Keep Mychelin differentiation explicit: Singapore family/dialect capture, provenance, agak-agak uncertainty, attempts/next-try/version/definitive workflow, meal planning, shopping, and Cook with Me.
- Park RSS/blog recipe inboxes, Paprika-style imports, and native Apple ecosystem parity until pilot users show strong online-recipe-backlog demand. Near-term equivalents are PWA notifications, calendar backlinks/prep events, shopping-list exports, and better import/cooking reliability.
- Add a dedicated Scan recipe photo/OCR capture path under Create recipe, separate from Import URL and Paste recipe text.
- OCR MVP flow: upload or take a photo, extract text, show editable OCR text for correction, then send the confirmed text through the existing paste parser to produce recipe fields.
- Import handwritten recipe cards, cookbook pages, WhatsApp screenshots, and old family photos.
- Use a vision/OCR provider for image-to-text; keep DeepSeek focused on text reasoning and recipe extraction after OCR text is available.
- Discovery note from local-food AI competitors such as the unverified HawkerSense example: generic food vision/object-detection is likely weak for Singaporean dishes with overlapping components, dark sauces, hidden gravies/oils, and family-specific preparation habits. When Mychelin adds photo/OCR capture, treat the image as recipe provenance plus cultural context, not just pixels to OCR.
- Build a Singapore-aware multimodal recipe-capture prompt layer after OCR MVP: identify likely dish family, preserve local/dialect terms, flag hidden or ambiguous preparation details, ask follow-up questions for missing quantities/timings/heat/sensory cues, and avoid pretending uncertain ingredients are confirmed.
- Prefer Mychelin-specific confidence signals over health-style grades: `cook-ready`, `missing details`, `needs family confirmation`, `provenance captured`, and `closer to home` are more aligned than calorie/Nutri-Grade-style scoring.
- Make image retention explicit: allow OCR without storing the source image, or preserve the original image as provenance when the user chooses it.
- If provenance images are stored, revisit private/signed media delivery because current Vercel Blob URLs are gated by discovery but public to anyone with the exact URL.
- Support source URLs for recipes adapted from online references.

### Discovery: localized multimodal food understanding

- Public verification for the specific HawkerSense/Wong Qi Han claims is pending; searches did not surface reliable primary/public sources for the app architecture or quoted UX details. Treat it as unverified competitor intelligence unless a primary source is found.
- The broader technical direction is still valid: current food-image nutrition research increasingly points to specialized multimodal/VLM approaches and curated food benchmarks because generic food recognition struggles with portion size, hidden ingredients, and nutrition inference.
- Mychelin should not become a nutrition tracker, but it should borrow the localized reasoning idea for recipe capture: Singapore family food requires context about preparation method, sauce/gravy, dialect naming, substitutions, and "agak-agak" sensory cues.
- Revisit this after the first pilot dry-run, before implementing Scan recipe photo/OCR beyond the basic text-extraction path.

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
