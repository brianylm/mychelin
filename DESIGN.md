# Mychelin Design System

Mychelin helps moved-out homecooks preserve, plan, and reliably cook the food they grew up with. The interface should feel like a well-kept family recipe book when reading and a calm kitchen workbench when acting.

This document applies the central Agrippa doctrine in `/home/cluser/.openclaw/workspace/AGRIPPA_UI.md` to Mychelin. It borrows SGDS v2's token discipline, accessible component contracts, templates, and documentation structure without government branding, Bootstrap assumptions, its exact palette, or civic-service tone. Hallmark supplies the anti-pattern audit lens. Epicure is a content and food-discovery reference, not a general component system. Zenas is not a Mychelin reference.

## Experience Model

- **Public site:** warm editorial storytelling with real food and family imagery, asymmetric layouts, strong type, and restrained calls to action.
- **Signed-in app:** quiet workbench with persistent navigation, dense but legible records, explicit modes, and predictable task flows.
- **Recipe reading:** long-document layout where the recipe, image, ingredients, steps, and provenance carry the visual weight.
- **Kitchen mode:** large touch targets, persistent timers, high contrast, minimal scrolling, and no ornamental motion.

## Foundations

- **Canvas:** warm paper `--ui-bg`; use solid surfaces, not decorative gradients.
- **Ink:** `--ui-text` for primary text and `--ui-muted` only where it passes normal-text contrast.
- **Accent:** burgundy `--ui-accent` marks active state, links, focus, and a small number of primary actions. It is not a page background.
- **Type:** Newsreader for editorial titles, DM Sans for body and controls, Libre Baskerville for the wordmark only.
- **Spacing:** use the shared 4pt-based `--space-*` scale. Let spacing and dividers establish hierarchy before borders or shadows.
- **Shape:** utility controls and work surfaces use restrained radii. Large soft shapes are reserved for the branded top navigation and photography where already established.
- **Motion:** short state transitions only. No decorative loops, bounce, parallax, or universal hover lift. Respect reduced motion.

## Components

- Use full-width sections and divider-led groups for settings, navigation, and instructional sequences.
- Use cards only for repeated records, modals, or a tool that needs a real boundary. Never nest cards.
- Keep one visually dominant action per region. Secondary actions should be text, outline, or menu items.
- Use icons for familiar tools and pair unfamiliar icons with accessible names or tooltips.
- Keep one-tap recipe creation routes visible; information architecture must not add friction to capture.
- Use visible labels for fields. Placeholder text demonstrates format, not the field's identity.
- Every control needs a visible focus state and a minimum 44px touch target.

## Content

- Name the actual task: “Import from link,” “Log cook,” “Set as definitive.”
- Prefer short, specific verbs over generic “Submit,” “Continue,” or promotional language.
- Empty states name what is empty, why it matters, and offer one primary next action.
- Errors say what failed and what the user can do next. Do not use jokes in failure paths.
- Preserve family terms and source phrasing where they are evidence, then provide translation or structured guidance alongside them.

## Accessibility Gate

- Body text meets WCAG 2.1 AA contrast; controls, boundaries, and focus indicators meet at least 3:1.
- Information is never conveyed by colour alone.
- Keyboard, pointer, and touch users can reach the same actions.
- Layouts are checked at 320px, 375px, 414px, 768px, and desktop widths with no horizontal scrolling.
- Interactive text does not wrap inside compact controls.
- Reduced-motion preference removes spatial motion while preserving state feedback.

## Implementation

- Tailwind and native CSS variables remain the implementation layer.
- Radix remains an interaction primitive where already used; avoid expanding its global visual role.
- Lucide remains the icon source. Do not draw replacement SVGs for familiar actions.
- Do not import `@govtechsg/sgds` wholesale. Translate useful SGDS patterns into Mychelin's existing tokens and components.
- Review substantial UI work with the repo-local `.codex/skills/mychelin-ui` playbook and Hallmark's audit vocabulary.

## Validation

Run focused lint, TypeScript, production build, responsive screenshots, keyboard/focus checks, and `git diff --check`. Treat auth, sharing, uploads, voice, and private family data as additional review gates whenever those surfaces are touched.
