// Feature kill switches. Rollback for the Cooking Card:
//   1. `git revert` the cooking-card commit (isolated, single commit), or
//   2. flip this constant to false and redeploy — the Recipe/Card toggle
//      disappears and every card module becomes unreachable.
export const COOKING_CARD_ENABLED = true;

// Rollback for the shared-page recipe card: flip to false and the public
// /shared/[token] page falls back to the classic recipe detail layout.
export const SHARED_RECIPE_CARD_ENABLED = true;

// OpenAI Realtime transcription for live conversation. OFF by default:
// OpenAI API has no free tier, and the Gemini chunked path handles
// dialect (Hokkien/Cantonese) far better. When false, recording goes
// straight to the chunked+-browser path and OpenAI is never called.
export const CONVERSATION_REALTIME_ENABLED = false;
