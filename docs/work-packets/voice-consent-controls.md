# Work Packet Draft — Voice and Consent Controls

Status: grill-me in progress
Owner: Agrippa + B
Source roadmap item: Mychelin ROADMAP.md → Voice and consent controls

## Product intent

Make Mychelin's voice recording flows clear, respectful, and privacy-safe, especially when a learner is recording an older/family cook.

The goal is not legalistic friction. The goal is calm trust: everyone should understand when recording is happening, what is captured, what is used to generate a recipe, and what can later be shared.

## Roadmap source

- Make voice recording flows clearer on mobile.
- Add privacy/consent affordances before recording or sharing audio.
- Separate raw recordings, transcripts, and public recipe text in the UI and data model where needed.
- Prefer OpenAI Realtime speech-to-text for live captions, browser live captions as a no-key production fallback, OpenAI request/response transcription for backup chunks, DeepSeek V4 Flash for text reasoning, and Gemini only as an optional fallback where dialect audio handling needs it.

## Initial hypothesis

V1 should add a lightweight consent checkpoint before recording family conversations, plus clear in-session recording state and post-session artifact controls.

The consent UX should be human, not scary:

- "Make sure everyone is okay being recorded."
- "Audio is used to create your private recipe draft."
- "You can delete the recording/transcript later."
- "Shared recipes do not include private recording/transcript details unless you choose to share them."

## Open grill questions

- Is consent a hard gate before every recording, first recording only, or contextual?
- Does Mychelin store raw audio for v1, or transcribe and discard when possible?
- Should users be able to delete raw audio separately from transcript and recipe?
- What should be visible during recording so older cooks know recording is active?
- Should sharing a recipe ever include transcript/audio, or recipe text only by default?
- What is the minimum consent copy that feels warm rather than legalistic?
