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

// First Recipe Guided Mission (post-onboarding dashboard card + flow).
// Rollback: flip to false and the mission card and flow disappear; the
// modules become unreachable and nothing else changes. Preview-first —
// production only after B accepts the staged mission.
export const FIRST_COOK_MISSION_ENABLED = true;

// Households (Slice 1: membership + shared meal plan with per-member
// blocking). Rollback: flip to false and redeploy — the Household nav tab
// and view disappear, every /api/households route 404s, and the
// meal-plans routes fall back to per-user scoping exactly as before.
// Household rows left in the DB stay harmlessly unreachable.
export const HOUSEHOLDS_ENABLED = true;
