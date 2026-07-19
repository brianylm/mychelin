# Work Packet Draft — First Recipe Guided Mission

Status: grill-me in progress
Owner: Agrippa + B
Source roadmap item: Mychelin ROADMAP.md → Activation, training, and habit loop → first-recipe guided mission

## Product intent

Help first-time users after signup understand what Mychelin can do and feel accompanied through their first cooking journey.

This is not a generic feature tour. It should guide someone who may not know what recipe apps do, may not know how Mychelin differs from other apps, and may not have cooked before.

The desired feeling: Mychelin is an easy companion that helps them get from “I don’t know where to start” to “I cooked something and recorded what happened.”

## Target user

First-time users after signup, especially users who:

- have no recipes yet
- do not know what Mychelin can do
- may not have cooked before
- need a gentle, concrete path into cooking

## Core success moment

The guided flow succeeds when the user:

1. Cooks their first recipe, preferably through **Cook with Me**.
2. Records the first attempt after cooking.

Creating a recipe alone is not enough; the product loop should lead to a cooked attempt.

## Flow direction

Use a **step-by-step wizard** rather than a passive checklist only.

The wizard should teach the Mychelin loop through action:

1. Pick or create a first recipe.
2. Plan/prep for cooking.
3. Generate or review shopping/prep needs.
4. Cook with Me.
5. Record attempt.
6. Connect result back to cooking rhythm / future improvement.

## Sample recipe vs user recipe

Support both:

- Use your own recipe.
- Practice with a sample recipe.

Product hypothesis: a sample recipe path is valuable because it lets new users safely learn the flow before trusting Mychelin with their own family recipe or real meal.

## Cooking rhythm integration

There is already a cooking rhythm feature. The guided mission should reuse and reinforce it rather than inventing a separate habit system.

Open implementation question: inspect current cooking rhythm/user preferences model and route the mission's completion/next prompt through that existing system where sensible.

## Open grill questions

- Should sample recipe be a real starter recipe, a synthetic sandbox recipe, or selected from existing starter data?
- Does the wizard start immediately after signup, on dashboard, or from profile/onboarding?
- Can users skip/dismiss it? If yes, where does it live afterward?
- What exact steps are required before Cook with Me starts?
- What should the final completion screen say/do?
- Should completion update cooking rhythm/progress immediately?
- Definition of done for v1.
