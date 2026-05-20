# Mychelin App Interior — Design Audit

## Landing Page Design Language (Reference)

**Palette:** Warm off-white `#fafaf8`, near-black `#1a1a1a`, warm gray `#6b6b6b`, mid-gray `#4a4a4a`, warm borders `#e8e8e3` / `#c4c4bf`. Amber accent `#d97706` used sparingly as punctuation.

**Typography:** DM Sans (light 300 for hero, semibold for headings) + Satoshi for body. Light weight, tight tracking (`tracking-tight`), generous line-height (`leading-relaxed`).

**Cards:** `rounded-2xl` to `rounded-3xl`, `border` in warm stone tones, `bg-white`, minimal/no shadow. Generous padding (`px-8 py-14`+).

**Buttons:** Consistent pill shape (`rounded-full`). Primary: dark fill. Secondary: bordered with `bg-white/80` + backdrop blur.

**Rhythm:** Very generous whitespace between sections (`mt-16` to `mt-24`). Sections feel like "scenes" not stacked boxes.

**Nav:** Floating glass pill — `rounded-full bg-white/70 backdrop-blur-xl ring-1 ring-stone-200/60` with subtle inset highlight.

---

## App Interior — Visual Audit

### 1. Typography: Disconnected from Landing

| Landing | App |
|---------|-----|
| DM Sans (headings), Satoshi (body) | Inter declared in CSS, but most components fall back to `system-ui` via Tailwind/Radix |
| Hero at `font-weight: 300` with `tracking-tight` | No light-weight headings anywhere |
| `EB Garamond` set for `h1-h6` in CSS | Barely used — most headings are `span`/`div` with `font-semibold` or Radix components |
| Warm body text `#6b6b6b` / `#4a4a4a` | `text-neutral-500` / `text-neutral-400` — cooler, harsher |

**Impact:** The app feels like a different product. No elegant heading hierarchy. The warm, editorial voice of the landing is lost.

### 2. Color Palette: Close but Not Cohesive

The app *almost* matches the landing (`bg-surface` = `#f6f6f5` vs landing `#fafaf8`) but then diverges:

- **Borders:** Landing uses `#e8e8e3` and `#c4c4bf`. App uses `neutral-200` (`#e5e5e5`) and `neutral-300` (`#d4d4d4`). Slightly cooler, more generic.
- **Text:** Landing's `#1a1a1a` vs `neutral-800` (`#262626`), `#6b6b6b` vs `neutral-500` (`#737373`). The landing colors are hand-picked and warmer.
- **Amber usage:** Landing uses amber *only* for labels ("LEARN", "COOK") and links. App sprinkles amber on badges, buttons, borders, active states — it's louder and less disciplined.

### 3. Card & Container Styling: Functional vs. Polished

**Landing cards:** `rounded-2xl border border-[#e8e8e3] bg-white px-6 py-8` — soft, editorial, no shadow.

**App cards:** `rounded-2xl border border-neutral-200 bg-white p-5` — same structural pattern but:
- Padding is tighter (`p-5` vs `px-6 py-8`+)
- Borders are cooler (`neutral-200`)
- Some cards add `shadow-sm` which the landing avoids
- The "trust" section is `rounded-3xl` with `px-8 py-14` — the app has no equivalent large-radius moments

**Specific card issues:**
- `RecipeTitleCard`: `grid gap-2` + `p-5` feels cramped for the most important element on the page
- `CollapsibleSection`: `p-4` on the button header is tight; the chevron feels bolted-on
- Sidebar items: `space-y-0.5` is extremely tight — list items feel crammed

### 4. Buttons: Inconsistent Language

The landing commits fully to pill buttons (`rounded-full`). The app uses:
- Radix `Button` (default `rounded-md`)
- Custom `rounded-xl` buttons (Share, Delete)
- Custom `rounded-lg` inputs
- `rounded-full` only in a few places (surprise-me FAB, user avatar)

This creates visual noise. A recipe app with 15+ interactive elements per screen needs a single button grammar.

### 5. Header & Navigation: Lost Opportunity

**Landing nav:** Floating glass pill with backdrop blur, warm stone ring, inset highlight.

**App header (`Header.tsx`):** `h-[50px] border-b border-neutral-200 bg-white/80` — flat, utilitarian, generic. The hamburger icon is a raw SVG. The profile button is a colored circle with a single letter — no warmth.

**BottomNav:** Functional but plain. Active state is `text-amber-700` on a white background. The landing would use a pill or soft filled background for the active tab.

**DesktopNav:** `rounded-lg` segmented control in `bg-neutral-50` — decent, but the active state is `bg-amber-600 text-white` which is high-contrast and loud. Landing's active states are subtler (text color change + soft background).

### 6. Spacing & Rhythm: Dense and Flat

- **Recipe detail:** Sections stack with `gap-4` (`md:gap-8`) — okay but monotonous. No variation in section weight.
- **Ingredient list items:** `space-y-2` between rows, `px-3 py-2` per item — functional but could use more vertical breathing room
- **Steps list:** Same density issue
- **Sidebar:** `px-2 py-3` — extremely tight for a primary navigation surface
- **No section dividers:** The landing uses `border-t` sparingly and with warmth. The app has no equivalent — sections just stack.

### 7. Empty States: Adequate but Unremarkable

| Location | Current | Landing Equivalent |
|----------|---------|-------------------|
| No recipes (sidebar) | "No recipes yet. Create one!" in `text-xs` | Would be a centered card with emoji + warmer text + CTA button |
| Fridge empty | 🧊 + text-sm text-neutral-500 | Would be a `rounded-3xl` card with more padding and a story-like prompt |
| Shopping empty | 🛒 + similar | Same issue |
| Welcome screen | Centered `icon-welcome.png` + `Button` | Actually decent, but the Radix Button clashes |

### 8. Form Inputs: Generic Tailwind

```
rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2
```

Used everywhere. Landing doesn't show forms, but if it did they'd likely use:
- Warmer border (`#e8e8e3`)
- Slightly more padding
- `bg-white` not `bg-neutral-50` (neutral-50 feels "disabled")
- Softer focus ring (`ring-amber-100` is good, but `focus:bg-white` is abrupt)

### 9. Where the Landing Patterns DON'T Work

These areas should stay functional and NOT be over-designed:

- **Ingredient list table:** The name/qty/unit grid must remain scannable. Don't add rounded pills or shadows to each row.
- **Step drag handles:** The grip icon needs to remain utilitarian. Don't style it into a button.
- **Sidebar recipe list:** Must stay information-dense. Increasing padding too much would reduce scannability.
- **Meal planner calendar grid:** The month view needs clean lines and small text. Rounded cards per day would look childish.
- **Form fields in inline editing:** The `border-transparent → hover:border-neutral-200 → focus:border-amber-400` pattern in RecipeSteps/IngredientList is actually smart — keep it.

---

## Recommendations

### Quick Wins (CSS/Tailwind Tweaks — 1-2 hours)

1. **Unify text colors** — Replace `text-neutral-500` / `text-neutral-400` in app components with warmer custom values (`#6b6b6b` / `#9b9b9b`) or add them as CSS variables. The `neutral-*` scale is too cool.

2. **Unify border colors** — Replace `border-neutral-200` on cards with `border-[#e8e8e3]` (or define `--color-border-warm`). Same for `border-neutral-300` on inputs → slightly warmer.

3. **Increase card padding** — Recipe detail cards: `p-5` → `p-6` or `px-6 py-5`. Title card: `p-5` → `p-6`. Small change, more breathing room.

4. **Sidebar spacing** — `space-y-0.5` → `space-y-1` and `px-2 py-3` → `px-3 py-4` in the scrollable area. Still dense, but not crammed.

5. **Header warmth** — Change `border-b border-neutral-200` to `border-b border-[#e8e8e3]`. Consider adding `backdrop-blur-xl` instead of `backdrop-blur-sm`. The landing's nav blur is much softer.

6. **Button consistency** — Pick one radius for secondary actions: either all `rounded-xl` (app current) or all `rounded-full` (landing). My recommendation: keep functional buttons `rounded-xl` (forms, actions) but make navigation/pill buttons `rounded-full` (desktop nav active state, FAB, tags).

7. **Empty state polish** — Wrap all empty states in a `rounded-2xl bg-white border border-[#e8e8e3] p-8` card with centered content. Add `text-[#6b6b6b]` instead of `text-neutral-500`.

### Medium Effort (Component Restructuring — Half Day)

8. **Typography hierarchy in recipe detail** — The `RecipeTitleCard` should feel special. Consider:
   - Using `font-family: DM Sans` (or the existing EB Garamond) for the title
   - Light weight (`font-light`) for large titles
   - `text-2xl` instead of inheriting default size
   - More vertical padding (`py-6`)

9. **Section rhythm in recipe view** — Instead of uniform `gap-4` between every card, use:
   - `gap-3` for related functional groups (ingredients → steps)
   - `gap-6` or `gap-8` between logical sections (core → details → heritage)
   - A subtle `bg-[#fafaf8]` or `bg-neutral-50/30` divider background for the Heritage section to give it visual weight

10. **Desktop nav refinement** — Instead of `bg-amber-600 text-white` for active tabs, try `bg-white ring-1 ring-[#e8e8e3] text-[#1a1a1a]` with a small amber dot or bottom border. The current high-contrast amber fill is jarring against the soft landing aesthetic.

11. **Auth screen alignment** — The `AuthScreen` form card uses `rounded-2xl border-neutral-200` — update to `border-[#e8e8e3]` and slightly more padding. The field labels (`uppercase tracking-wide text-neutral-500`) are fine but could be `text-[#9b9b9b]` for warmth.

12. **BottomNav active state** — Instead of just `text-amber-700`, add a small top indicator or soft background pill. A 2px amber line above the active tab (`before:absolute before:top-0 before:h-0.5 before:w-8 before:bg-amber-600`) would feel more intentional.

### Structural Changes (Architectural — 1-2 Days)

13. **Create a shared `Card` primitive** — Both landing and app use the same card pattern but with different Tailwind classes. Extract a `Card` component that enforces:
   ```tsx
   rounded-2xl border border-[#e8e8e3] bg-white
   ```
   With variants: `padding: "sm" | "md" | "lg"` and `radius: "2xl" | "3xl"`.

14. **Create a shared `Section` primitive** — The landing's section spacing (`mt-16` to `mt-24`, `max-w-5xl`, `px-6`) should be a reusable layout component. The app's views currently inline their own `max-w-3xl px-4 py-6` — inconsistent.

15. **Font loading strategy** — The landing loads DM Sans and Satoshi (presumably via `<link>` or Next font). The app loads Inter and EB Garamond via `next/font/google` but only EB Garamond is enforced for headings. Consider:
   - Using EB Garamond for *all* headings in the app (not just semantic `h1-h6`)
   - Loading DM Sans for the app hero/welcome areas
   - Or: accept the split and make the app intentionally more utilitarian, but document it

16. **Color token consolidation** — The app currently mixes:
   - Tailwind `neutral-*` scale
   - Custom CSS variables (`--surface`, `--accent`)
   - Radix theme overrides (`--accent-1` through `--accent-12`)
   - Arbitrary hex values in components (`border-[#e8e8e3]` in landing)
   
   Consolidate into a single theme file with warm neutrals:
   ```css
   --color-text-primary: #1a1a1a;
   --color-text-secondary: #6b6b6b;
   --color-text-muted: #9b9b9b;
   --color-border: #e8e8e3;
   --color-border-light: #f0f0eb;
   --color-surface: #f6f6f5;
   --color-surface-warm: #fafaf8;
   ```

---

## Priority Order

**Do immediately (today):**
1. Unify border colors (`neutral-200` → warm custom)
2. Unify text secondary colors (`neutral-500` → `#6b6b6b`)
3. Increase card padding slightly
4. Fix sidebar spacing

**Do this week:**
5. Create shared `Card` + `Section` primitives
6. Refine recipe title typography (size, weight, font)
7. Improve empty states with card wrapper + warmer text
8. Tone down desktop nav active state

**Do when refactoring:**
9. Full color token consolidation
10. Font strategy decision (DM Sans vs EB Garamond vs Inter)
11. Section rhythm in recipe detail (variable gaps)
12. Header glassmorphism upgrade

---

## Summary

The app is well-built and functional. The core issue is **aesthetic drift**: the landing page was clearly designed with intention (warm tones, editorial typography, generous spacing, pill buttons), while the app interior was built function-first with off-the-shelf Tailwind defaults (`neutral-*`, `rounded-lg`, `gap-4`).

The gap is not structural — the app *has* rounded cards, warm surface backgrounds, and amber accents. It's a matter of **tightening the execution**: using the exact same border colors, text colors, padding values, and typography weights that make the landing feel polished.

The good news: almost all of this is achievable through CSS token changes and small Tailwind class tweaks. No redesign required.
