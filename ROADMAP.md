# Mychelin Roadmap

Mychelin's roadmap is about making family food heritage capture trustworthy, practical, and respectful of privacy.

## Near term

### AI recipe capture

- Turn conversations, pasted notes, and rough instructions into structured recipes.
- Ask clarifying questions for missing timings, quantities, substitutions, and sensory cues.
- Preserve uncertainty instead of hallucinating precision where family cooks say "agak-agak".

### Dialect and multilingual support

- Improve capture for Singapore family language mixes: English, Mandarin, Malay, Tamil, Hokkien, Teochew, Cantonese, Hakka, Hainanese, and Peranakan/Nyonya vocabulary.
- Support side-by-side original phrasing and translated cooking instructions.
- Add reviewer flows so families can correct AI transcription/translation.

### Voice and consent controls

- Make voice recording flows clearer on mobile.
- Add privacy/consent affordances before recording or sharing audio.
- Separate raw recordings, transcripts, and public recipe text in the UI and data model where needed.
- Prefer OpenAI speech-to-text for first-pass transcription, with Gemini fallback where dialect handling or diarization needs it.

### Activation and habit loop

- Use onboarding to capture a user's first goal: learn to cook, cook regularly, save family recipes, plan meals, or reduce waste.
- Bias the first session toward a fast magic moment: one messy family recipe becomes one usable cookable recipe.
- Keep improving the first-draft recipe prompt flow: users can ask Mychelin to create specific recipes they want to try, then save them as editable first drafts before cooking/refining. Prefer DeepSeek v4 Flash for structured text drafting when configured, with Gemini fallback; keep OpenAI speech-to-text for audio transcription.
- Treat Duolingo-style stickiness as a low-friction cooking loop, not points for their own sake: one small cooking promise, one first recipe, one attempt, one improvement.
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

- Import handwritten recipe cards and old family photos.
- Extract ingredients/steps while preserving the original image as provenance.
- Support source URLs for recipes adapted from online references.

### Demo and documentation assets

- Add privacy-safe screenshots and demo data.
- Document a guided "capture Ah Ma's recipe" flow for heritage partners and reviewers.

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
