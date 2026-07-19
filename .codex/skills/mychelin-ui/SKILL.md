---
name: mychelin-ui
description: Design, audit, or refine Mychelin user interfaces while preserving its warm editorial brand, quiet workbench application structure, mobile kitchen ergonomics, accessibility baseline, and existing Tailwind, CSS-variable, Radix, and lucide implementation patterns. Use for Mychelin page, component, layout, navigation, form, responsive, or visual-system work.
---

# Mychelin UI

Use this skill for user-facing interface work in the Mychelin repository. Keep product behavior and privacy boundaries intact while improving hierarchy, legibility, responsiveness, and interaction quality.

## Start With Context

1. Read `AGENTS.md` and `DESIGN.md` from the repository root.
2. Read the relevant component and its surrounding layout before proposing changes.
3. Check `app/src/app/globals.css` and existing primitives before adding tokens or abstractions.
4. Read `/home/cluser/.openclaw/workspace/AGRIPPA_UI.md` when available for the wider Agrippa doctrine.

## Design Direction

- Treat the public site as warm editorial food storytelling and the signed-in app as a quiet, task-focused workbench.
- Preserve the current Newsreader display, DM Sans utility, Libre Baskerville wordmark, warm paper, ink, and burgundy accent system.
- Use provenance, recipe content, family context, and real food imagery as the visual interest. Do not add ornamental gradients, glows, glass effects, or generic illustrations.
- Prefer full-width sections, hairline dividers, compact lists, and clear primary actions over repeated floating cards.
- Keep cards for repeated records, modals, and genuinely framed tools. Never put a card inside another card.
- Do not use equal three-column icon feature grids, fake device chrome, decorative icon tiles, or per-page visual themes.

## Implementation Rules

- Use semantic CSS variables and Tailwind utilities. Extend the existing token source instead of creating another styling runtime.
- Use existing Radix primitives for accessible behavior and lucide icons for familiar actions. Do not import SGDS or another component system wholesale.
- Keep radii at 8px or less for controls and utility surfaces unless an existing product component requires otherwise.
- Replace `transition-all` with named properties. Animate only when the state change benefits from continuity.
- Every interactive control needs default, hover where applicable, focus-visible, active, disabled, loading, and error handling relevant to that control.
- Keep touch targets at least 44 by 44 CSS pixels. Pair every hover affordance with keyboard focus and touch access.
- Keep display copy within its container at 320px, 375px, 414px, and 768px. Use stable grid tracks and `min-width: 0` where content can grow.
- Use skeletons for predictable loading layouts. Keep success quiet when the result is already visible.

## Product Constraints

- Optimise for moved-out homecooks, family recipe capture, and kitchen use. The app is not a restaurant guide.
- Keep core actions one tap away on mobile. Do not add a second navigation layer just to make the information architecture look tidier.
- Preserve recipe ownership, sharing boundaries, transcript sensitivity, and user-scoped data access.
- Do not rewrite copy without understanding the product behavior it names.

## Validation

1. Run focused lint on changed components.
2. Run `npx tsc --noEmit` and `npm run build` for meaningful UI changes.
3. Inspect at 320px, 375px, 414px, 768px, and a desktop width. Check overflow, text clipping, touch targets, focus, and reduced motion.
4. Run `git diff --check` from the repository root.
5. Append a concise dated entry to `MEMORY.md` after meaningful work.
