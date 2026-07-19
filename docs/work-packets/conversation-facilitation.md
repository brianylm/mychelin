# Work Packet Draft — Conversation Facilitation

Status: ready for first implementation pass, with explicit v1 assumptions
Owner: Agrippa + B
Source roadmap item: Mychelin ROADMAP.md → Conversation facilitation

## Product intent

Turn recipe recording from passive transcription into a gentle conversation helper.

The product should help a learner capture a family recipe while staying present with the cook, especially when the cook speaks informally, uses dialect/family terms, or describes cooking by feel.

The assistant should listen for missing practical details and suggest respectful follow-up questions the learner can ask, without interrupting or making the older/family cook feel interrogated.

## Roadmap source

- Listen for missing quantities, timings, heat levels, sensory cues, substitutions, and family-specific terms.
- Suggest respectful questions the learner can ask during the conversation.
- Keep the older family cook experience calm: no noisy interruptions, no pressure to speak in a formal recipe format, and no requirement to read the screen.
- Store raw transcript, translated transcript, AI-suggested questions, accepted answers, and final recipe extraction as separate artifacts where needed.

## Locked product decisions

### Operating mode

The helper operates **live during recording**. It sits in the middle of a real conversation between an older/family cook and the learner.

This is not a post-hoc transcript review tool for v1. The point is to help the learner ask better questions while the conversation is happening.

### Audience and interaction model

Suggested questions are for the **learner/user only**.

Mychelin must never speak/interject aloud in v1. It should not behave like a voice assistant or make the older cook feel like they are talking to an app.

Instead, it should quietly encourage the learner to communicate with the older cook using dialect or mother tongue where possible, so the older cook feels they are engaging with a person rather than software.

### Missing-detail categories for v1

Focus on these categories:

- quantity
- timing
- heat level
- substitutions
- order of operations
- family explanation / family-specific context

### Suggestion handling

Suggested question cards should appear and disappear based on transcript coverage:

- If the learner asks the question and the answer is captured in the transcript, the card should disappear automatically.
- If the detail is still not captured, the card should stay visible until dismissed.
- This supports asking questions after the older cook finishes a monologue instead of interrupting.
- Show at most **3 active question cards** by default.
- Put additional suggestions under a **Show more** caret.
- Every suggestion/action must be dismissible.

Avoid explicit "Asked" / "Useful" actions for v1 unless transcript detection proves too unreliable. The preferred behavior is passive transcript-aware resolution plus manual dismissal.

## MVP flow hypothesis

1. User starts live conversation recording.
2. Mychelin transcribes/listens in near-realtime.
3. Mychelin detects missing cookability details in the categories above.
4. Mychelin quietly shows learner-only suggested question cards.
5. Show 3 suggestions first; overflow goes under Show more.
6. Learner asks useful questions verbally in their own words/dialect/mother tongue, either during the monologue or after it pauses.
7. Mychelin captures the follow-up answer in the transcript.
8. Cards disappear when the transcript fills the missing detail; unresolved cards remain until dismissed.
9. Final recipe extraction uses the transcript plus captured follow-up answers.

## V1 implementation assumptions

These defaults make the packet shippable without more product grilling:

### Suggestion language

Use the learner's current UI/input language for generated cards, but phrase suggestions as prompts the learner can naturally translate into dialect/mother tongue.

Example tone:

- "Ask how hot the wok should be when the garlic goes in."
- "Ask what it should smell like before adding water."
- "Ask what Ah Ma means by ' agak-agak' here — roughly how much?"

Do not auto-generate dialect text unless the transcript already contains enough confident language context. Bad dialect is worse than plain English.

### Artifact boundaries

For v1, keep artifacts minimal and privacy-safe:

- raw/live transcript remains the core captured artifact
- suggested question cards can be stored as lightweight session metadata if the current data model supports it
- dismissed suggestions should not be included in recipe extraction
- transcript-resolved suggestions do not need separate durable "accepted answer" records yet
- final recipe extraction should use the transcript after follow-up answers are captured

If durable suggestion storage requires a risky schema change, implement in-session suggestions first and defer durable card history.

### UX surface

Add the helper to the existing live conversation/capture surface rather than creating a separate mode.

Recommended UI:

- compact "Ask next" / "Possible questions" panel
- maximum 3 visible cards
- overflow under Show more
- each card has dismiss action
- cards auto-clear when transcript coverage resolves the missing detail
- no audio, no speaking, no assistant interruption

### Detection behavior

The first pass does not need perfect semantic proof. It should be conservative:

- generate suggestions only when a missing detail is likely and useful
- avoid repeating the same category too often
- suppress suggestions while the transcript is too short/noisy
- prefer fewer better cards over a constant stream

### Done criteria for first extended Codex session

The implementation is done when:

1. Live conversation recording shows learner-only suggested question cards.
2. Suggestions cover the v1 categories: quantity, timing, heat, substitutions, order of operations, family explanation/context.
3. Only 3 cards are visible by default; overflow is behind Show more.
4. Every card is dismissible.
5. Cards disappear when transcript content appears to resolve the missing detail.
6. Mychelin never speaks or emits audio prompts.
7. Final recipe extraction can benefit from follow-up answers captured in the transcript.
8. The feature is best-effort: failures in suggestion generation must not break recording/transcription.
9. Existing live transcription/capture tests or smoke checks still pass.
10. Production deployment is verified after implementation.

## Later decisions / not required for first pass

- High-confidence dialect/mother-tongue generation.
- Durable accepted-answer artifacts separate from transcript.
- Post-recording review assistant.
- Analytics for which suggestion categories were dismissed/resolved.
- Advanced speaker labeling between learner and older cook.
