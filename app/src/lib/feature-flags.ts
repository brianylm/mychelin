// Feature kill switches. Rollback for the Cooking Card:
//   1. `git revert` the cooking-card commit (isolated, single commit), or
//   2. flip this constant to false and redeploy — the Recipe/Card toggle
//      disappears and every card module becomes unreachable.
export const COOKING_CARD_ENABLED = true;
