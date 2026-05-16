# Landing Page — Session Memory

**Date:** 2026-05-12
**Deployed:** ✅ `https://mychelin-sg.vercel.app`

## What was done

Built a marketing landing page applying mikeoss.com design patterns to Mychelin. The page replaces the root `/` route for unauthenticated users. Authenticated users still see the RecipeWorkspace app.

### Code location (critical)

The **deployed code** lives in `mychelin-1/src/` — NOT the root `src/`. Vercel is configured to build from the `mychelin-1/` subdirectory.

| File | Purpose |
|---|---|
| `mychelin-1/src/app/page.tsx` | Auth dispatch: LandingPage for guests, RecipeWorkspace for logged-in |
| `mychelin-1/src/components/LandingPage.tsx` | Full landing page component (~280 lines) |
| `mychelin-1/src/app/layout.tsx` | Root layout — Inter font, AppProviders, `bg-surface` theme |

Root `src/` was a prototype shell and is **not deployed**. Changes there do not go to production.

### Patterns applied (from mikeoss.com comparison)

- ✅ **Eyebrow labels** — `text-xs uppercase tracking-widest` above each section heading
- ✅ **Alternating section backgrounds** — white ↔ `bg-stone-50` rhythm
- ✅ **Feature cards with screenshot placeholders** — 7 cards (3 Capture + 4 Cook), each with tinted gradient area (`aspect-[16/10]`), title, and description
- ✅ **Dual CTA** — "Start for free" (amber solid) + "How it works" (ghost scroll-to-#capture)
- ✅ **Dramatized typography** — Hero h1 at `text-7xl`, section h2 at `text-5xl`, body at `text-xl`
- ✅ **Full-viewport hero** — `min-h-[88vh] md:min-h-[92vh]` with amber watercolour CSS gradient + dark overlay
- ✅ **Floating glassmorphism nav** — pill-shaped `rounded-full`, `backdrop-blur-xl`, `top-5` centered, inset + outer shadows, logo + How it works / Story / Start cooking links + Sign in
- ❌ **Definition lists** — replaced by feature card grids (higher impact)
- ❌ **Video demo** — needs production work

### Image specs needed

| Asset | Dimensions | Ratio | Notes |
|---|---|---|---|
| **Hero painting** | 2560×1440px | 16:9 | Watercolour style, warm amber/gold/cream palette. Dark enough at edges for white text. Monet/impressionist feel. Suggestion: "Across Two Kitchens" — split composition with conversation flowing into a recipe card. |
| **Feature screenshots** | 800×500px | 16:10 | 7 total. One per card. Each card has a distinct tint so you can see which goes where (amber, yellow, orange, sky, green, rose, violet). |

### Section flow

1. **Hero** — "Cook like home, even in your new home." / CTA / trust line
2. **Problem** — bg-stone-50 / eyebrow: "The Problem"
3. **Capture** — 3 feature cards / eyebrow: "Capture"
4. **Cook** — 4 feature cards (2x2 grid) / eyebrow: "Cook"
5. **Story Moment** — centered blockquote / emotional interlude
6. **Bigger Picture** — bg-stone-50 / "Get in touch" link
7. **Final CTA** — "Start with the one recipe…" / CTA / trust line

### Auth dispatch logic

```tsx
// mychelin-1/src/app/page.tsx
const user = await getCurrentUser(); // checks "mychelin_token" cookie
if (!user) return <LandingPage />;
return <RecipeWorkspace />;
```

`dynamic = "force-dynamic"` because of cookie read. Landing page is a static component but the page-level auth check makes the route dynamic.

### Design system (mychelin-1)

- **Font:** Inter (body) + EB Garamond (headings) — same pairing as mikeoss.com
- **Accent:** amber-600/700 (matches app theme)
- **Background:** CSS variables `bg-surface` / `text-foreground`
- **Icons:** lucide-react (just installed) + @radix-ui/react-icons
- **Framework:** Tailwind v4 (CSS-based config, no tailwind.config.js)
- **UI Kit:** Radix Themes (wraps the app via AppProviders)

### To resume

1. Get hero watercolour painting (2560×1440) — swap in via the `style` prop on the hero `<section>`
2. Get 7 feature screenshots (800×500) — replace the "Screenshot" placeholder spans
3. Add floating glassmorphism nav to landing page (optional — current app Header may conflict)
4. Create `/signup` page in mychelin-1 (currently only `/login` exists)
5. Add video demo section (high effort, needs filming)

### Deploy command

```bash
cd /home/cluser/projects/mychelin && vercel --prod
```

### Live URL

https://mychelin-sg.vercel.app
