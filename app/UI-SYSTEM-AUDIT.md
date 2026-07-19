# Mychelin UI System Audit and Implementation Plan

_Created: 2026-06-04_

> **July 2026 status:** the original implementation sequence below is retained as historical analysis, but it is superseded by `UI-BASELINE.md`. A broad implementation of the old sequence caused visual and performance regressions and was rolled back. Future work is performance-first, one reversible product surface per phase, with staging acceptance before production.

This audit applies the central Agrippa UI doctrine from `~/.openclaw/workspace/AGRIPPA_UI.md` to Mychelin specifically. It does not replace Mychelin's warm family-cooking brand; it turns the doctrine into product-specific rules, debt areas, and implementation slices.

Related context:

- `app/DESIGN-AUDIT.md` covers user-flow and activation gaps.
- `AGENTS.md` defines Mychelin product direction and implementation constraints.
- `~/.openclaw/workspace/AGRIPPA_UI.md` is the cross-product UI doctrine and anti-slop baseline.

## Product UI Thesis

Mychelin should feel like a reliable kitchen companion for family cooking: warm, calm, practical, and legible while cooking. The app should reduce mental load around what to cook, what to buy, and how to improve family recipes over time.

The visual system should be restrained:

- warm editorial canvas, not generic SaaS gray
- burgundy as a controlled action/accent color, not a wash over every component
- recipe evidence and provenance before decorative polish
- large touch targets and clear states for kitchen use
- reusable primitives before one-off cards, buttons, and modal shells

## Doctrine Fit Summary

| Doctrine area | Current Mychelin state | Risk | Direction |
|---|---|---:|---|
| Semantic tokens | `globals.css` has warm surface/accent variables and Radix overrides, but many screens still use raw hex, raw neutral classes, and local shadow/radius choices. | Medium | Add a Mychelin token card and map common surface/text/border/focus/action classes to reusable primitives. |
| Component primitives | Some shared UI exists (`EditableField`, `Combobox`, `CollapsibleSection`, Radix `Button`), but screens still hand-roll buttons, dialogs, cards, filters, alerts, and empty states. | High | Standardize Button, Field, Dialog, Panel, DataList, FilterBar, Alert, EmptyState first. |
| Accessibility baseline | Basic semantics are mostly present; focus/labels/error association are inconsistent, especially in custom controls and modals. | High | Treat visible labels, focus rings, keyboard behavior, and contrast as required gates for every UI change. |
| Anti-slop rules | The app mostly avoids purple/glassmorphism, but still has gradients, nested card-like surfaces, oversized shadows, emoji status markers, and repeated ad hoc helper copy. | Medium | Remove decorative gradients/glows from operational screens; use hierarchy, labels, and state instead. |
| Product fit | Core flows match the product: recipes, planning, shopping, fridge, cook-with-me. Some UI still feels like feature inventory rather than a guided workflow. | High | Organize around the loop: capture -> plan -> shop -> cook -> review/improve. |

## Current UI Debt Map

### 1. Tokens and Theme

Observed:

- `app/src/app/globals.css` defines Mychelin surfaces and burgundy accent, plus Radix accent overrides.
- Components still use raw values such as `#800020`, `#17131f`, `#241017`, `neutral-*`, custom shadows, and local rounded sizes.
- The recent contrast patch fixes unreadable dark buttons globally, but it is a safeguard over inconsistent button construction rather than a complete primitive.

Risks:

- Future UI work will continue to drift because agents and humans can choose raw classes per screen.
- Contrast fixes become reactive instead of systemic.

Target:

- Keep Mychelin colors, but expose semantic tokens for `bg`, `surface`, `surface-raised`, `text`, `muted`, `border`, `accent`, `accent-muted`, `danger`, `warning`, `success`, `focus`.
- Define standard action classes through components, not repeated Tailwind strings.
- Keep body background calm. Avoid decorative radial gradients in authenticated operational screens if they compete with content.

### 2. Buttons and Icon Buttons

Observed:

- Buttons are a mix of Radix `Button`, plain `button`, custom Tailwind, and icon-only controls.
- Dark primary buttons now have readable text, but styling varies across recipe detail, planner, capture, cook-with-me, and dialogs.
- Some icon buttons lack consistent accessible labels and focus treatment.

Target primitive:

- `Button`: `primary`, `secondary`, `tertiary`, `danger`, `quiet`; supports `size`, `iconStart`, `iconEnd`, `loading`, `disabled`, full-width mobile behavior.
- `IconButton`: stable square dimensions, tooltip/aria label, visible focus, no text overflow risk.

Priority surfaces:

- meal planner add-meal modal
- recipe detail actions
- capture/import modals
- sidebar recipe cook/open/delete actions

### 3. Dialogs and Modals

Observed:

- `PasteRecipeModal`, `ConversationCapture`, meal planner add dialog, share modal, version modals, and book modals each define their own overlay/shell/footer patterns.
- Some modals are appropriate for focused tasks, but capture and conversation flows are multi-step and can become cramped.
- Styling varies: `rounded-[2rem]`, `rounded-2xl`, `shadow-2xl`, `backdrop-blur`, `bg-white/[0.58]`, full-screen mobile shells.

Risks:

- Inconsistent escape/click-outside behavior, focus return, scrolling, footers, and error placement.
- Complex capture tasks can feel fragile because shell behavior changes by entry point.

Target primitive:

- `Dialog`: overlay, title/subtitle region, content scroll region, footer actions, focus trap/return, escape behavior, mobile full-height option.
- `WorkflowDialog`: for multi-step capture/import/review flows, with persistent step/state area and durable error banner.

### 4. Panels, Cards, and Lists

Observed:

- Recipe detail uses many section components plus empty-state CTA cards.
- Meal planner recently gained richer recipe result rows, but the row/card style is local to `MealPlanView`.
- Capture CTAs use gradient card-like buttons with icon containers and small AI badges.
- The app risks card proliferation, especially in recipe detail, books, planner, fridge, and shopping surfaces.

Target:

- `Panel`: groups a page region.
- `ObjectCard`: represents a recipe/book/planned meal only.
- `ActionList` / `DataList`: for selectable rows and operational data.
- Avoid cards inside cards. Use dividers, sections, and list rows for dense workflows.

### 5. Forms and Fields

Observed:

- Recipe fields, capture textareas, speaker-name fields, fridge/shopping inputs, auth fields, and profile fields use varied label/help/error patterns.
- `PasteRecipeModal` textarea relies mostly on placeholder guidance; `ConversationCapture` speaker naming uses a good preview pattern but should use a shared field wrapper.
- Error banners exist but are local implementations.

Target primitive:

- `Field`: visible label, optional help, optional error, `aria-describedby`, required/disabled/read-only states.
- `TextInput`, `Textarea`, `Select`, `Checkbox`, `SegmentedControl` built on Field.
- `Alert`: info/success/warning/danger with icon optional but not emoji-dependent.

### 6. Search, Filters, and Result Rows

Observed:

- Recipe search exists in sidebar/search modal; meal planner now searches title/description/cuisine/ingredients and displays last cooked.
- Filter/search UI is not shared. Cuisine chips in planner are one-off.
- Search provenance is weak: users do not always see why a recipe matched.

Target primitive:

- `FilterBar`: search input, chips/select filters, sort, clear action, result count.
- `RecipeResultRow`: title, book/cuisine, ingredient/provenance snippets, last cooked, primary action.
- Match evidence should be visible when search matched an ingredient or note.

### 7. Capture and Import Flow

This is the most important UI-system pilot after planner search because capture is Mychelin's activation path.

Observed in `PasteRecipeModal`:

- Good: direct paste/URL tabs, draft fallback, URL detection, extraction retry, setup-error handling.
- Debt: custom modal shell, local segmented control, placeholder-heavy textarea guidance, mixed icon systems, decorative blur/shadow/rounded choices, local error banner.

Observed in `ConversationCapture`:

- Good: clear recording/naming/processing steps, live transcript, speaker labeling, setup-error banner, family-language context.
- Debt: emoji/icon status markers, custom modal shell, local error banner, local input fields, chat area styles not shared, unclear persistence if transcription fails mid-session, setup-error copy is developer-oriented for normal users.

Target capture template:

- Use `WorkflowDialog` shell for paste, URL, and conversation capture.
- Use `CaptureModeTabs`: Paste text, Import URL, Record conversation.
- Use one `Alert` for setup, permission, transcription, extraction, and save errors.
- Make the fallback path persistent: save raw text/transcript as draft, retry extraction, or continue manually.
- For conversation capture, keep speaker labeling but move it to shared `Field` rows and show transcript provenance clearly.
- Normal-user copy should say what to do next. Developer setup copy should be hidden from end users unless the app is in operator/admin context.

### 8. Cook-With-Me and Review Loop

Observed:

- Cook-with-me is now accessible from planned meals and recipe list surfaces.
- It captures changes and saves a cooking session/version, which supports last-cooked recency.
- The design should prioritize large step text, timers, next/back controls, and one-handed use.

Target:

- Treat `CookWithMeSession` as a full-screen workflow, not a standard modal.
- Reuse `Button`, `Alert`, `Panel`, and `Field` only where they do not reduce cooking legibility.
- End-of-session review should use a compact form template with durable notes and clear “better/closer to home/next time” prompts.

### 9. Operational Surfaces: Planner, Shopping, Fridge

Observed:

- Planner now supports month day planning and richer add-meal search.
- Shopping and fridge are likely to need dense operational UI: lists, status, expiry, quantities, aggregation.
- Current visual language can drift into many small cards unless constrained.

Target:

- Use `DataList` rows for shopping/fridge/inventory rather than isolated cards for every item.
- Use status badges for expiry/cooked/planned states with semantic color and text, not color alone.
- Planner add-meal picker should be the first `FilterBar + RecipeResultRow` implementation inside Mychelin.

## Implementation Sequence

The work should be reversible. Each phase should land as a small commit or a clearly isolated diff so it can be backed out without disturbing auth, schema, or cook-session work.

### Phase 0 - UI Guardrails and Local Card

Deliverables:

- Add `app/UI-SYSTEM-AUDIT.md` as this Mychelin-specific plan.
- Add a small local UI note later if useful, e.g. `app/src/components/ui/README.md`, pointing to Agrippa doctrine and listing Mychelin overrides.
- Create a short checklist for PR/review: tokens, primitives, focus, contrast, mobile, no decorative gradients/glows in operational screens.

Acceptance:

- Documentation-only change passes `git diff --check`.

### Phase 1 - Tokens and Primitive API

Deliverables:

- Extend `globals.css` with explicit semantic tokens: text, muted, border, raised surface, focus, success, warning, danger, info.
- Define `Button`, `IconButton`, `Field`, `Alert`, `Dialog`, `Panel`, `DataList`, `FilterBar`, `EmptyState` APIs before broad replacement.
- Keep Radix where it helps, but wrap app-level behavior and styling in Mychelin primitives.

Acceptance:

- Existing screens still build without visual regression.
- New primitives have visible focus states and disabled/loading styles.

### Phase 2 - Planner Search Pilot

Why first:

- Planner add-meal search was just improved and is a contained workflow.
- It needs search, filters, result rows, last-cooked evidence, empty state, and mobile ergonomics.

Deliverables:

- Replace local planner search/chip/result markup with `FilterBar` and `RecipeResultRow`.
- Show match evidence where possible: ingredient match, cuisine match, title match.
- Keep last-cooked recency visible and sorted least-recent first.
- Ensure month day planner and week add-meal flows share the same picker.

Acceptance:

- Keyboard can open, search, select, and add a meal.
- Mobile dialog has no horizontal overflow and footer actions remain reachable.
- `npx tsc --noEmit`, targeted ESLint, and build pass.

### Phase 3 - Recipe List and Search

Deliverables:

- Reuse `FilterBar` and `RecipeResultRow` in sidebar/search modal/card grid where appropriate.
- Add sort/filter affordances without overloading the sidebar.
- Surface last cooked, cuisine/book, and ingredient match evidence consistently.
- Keep direct `Cook with me` actions but standardize icon-button/action styling.

Acceptance:

- Users can find recipes by title, cuisine, and ingredients consistently in planner and recipe search.
- Recipe rows do not become mini cards with excessive copy.

### Phase 4 - Capture and Import, Including Conversation Capture

Deliverables:

- Convert `PasteRecipeModal` and `ConversationCapture` to shared `WorkflowDialog` shell.
- Replace local segmented controls, text inputs, textareas, error banners, and footer actions with primitives.
- Keep three capture paths clear: Paste text, Import URL, Record conversation.
- Conversation capture must preserve: live transcript, speaker side assignment, speaker naming, transcript-to-recipe extraction, and draft fallback.
- Add persistent fallback actions for capture failures: retry, save raw text/transcript as draft, continue manually.
- Rewrite setup/permission errors for users first; operator setup details can be secondary.

Acceptance:

- Microphone denied, missing AI key, extraction failure, and successful extraction all have clear next steps.
- Conversation transcript is not lost if extraction fails.
- Forms have visible labels and errors associated with fields.

### Phase 5 - Recipe Detail and Cook-With-Me

Deliverables:

- Replace empty-state CTA gradient cards with restrained action rows or object cards.
- Standardize Details and Heritage collapsible sections with `Panel`/`Field` primitives.
- Keep recipe core content first: title, photo, servings, ingredients, steps.
- Treat cook-with-me as its own full-screen kitchen workflow with large controls and minimal chrome.
- Standardize version/review actions and end-of-session review capture.

Acceptance:

- New recipe users see clear capture options without card clutter.
- Existing rich recipe data remains discoverable through progressive disclosure.

### Phase 6 - Shopping, Fridge, Books, Share

Deliverables:

- Apply `DataList`, `Alert`, `Panel`, and `EmptyState` to shopping and fridge.
- Use semantic status badges for expiry, bought, inventory availability, shared permissions.
- Tame share/signup surfaces so they are helpful, not aggressive.
- Keep books as collection objects; avoid making every recipe/book/member a decorative card cluster.

Acceptance:

- Shopping/fridge support dense repeated use on mobile.
- Sharing flows have clear loading/success/error states.

## Review Checklist for Mychelin UI Changes

Use this before merging/deploying meaningful UI work:

- Does the change use existing primitives or introduce a justified new primitive?
- Are colors semantic or at least consistent with Mychelin tokens?
- Are form controls visibly labeled?
- Are errors persistent enough for the user to act on?
- Does every interactive control have keyboard access and visible focus?
- Does the mobile layout avoid horizontal overflow and unreachable footers?
- Does the screen avoid decorative gradients/glows and nested cards unless they represent real objects?
- Does the copy say the next action clearly without repeating itself?
- For capture/conversation/cook flows: can the user recover without losing work?

## Immediate Next Move

Start with Phase 1 primitive definitions, then use Phase 2 planner search as the first implementation pilot. Do not refactor every screen at once. After the planner pilot proves the primitives, apply them to recipe search and then capture/conversation capture.
