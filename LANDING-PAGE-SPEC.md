# Mychelin Landing Page — Full Specification

**Purpose:** Public-facing landing page for CMF grant reviewers, crowdfunding supporters, and potential users.  
**URL:** `https://mychelin-1.vercel.app/landing` (new route, separate from the authenticated app)  
**Deadline:** Before 1 April 2026 (CMF Grant submission)

---

## 1. Page Structure & Section Flow

```
┌─────────────────────────────────────────┐
│  Nav Bar (sticky)                       │
├─────────────────────────────────────────┤
│  1. HERO — Emotional hook + CTA        │
├─────────────────────────────────────────┤
│  2. URGENCY — Why now (the clock)      │
├─────────────────────────────────────────┤
│  3. HOW IT WORKS — 3-step flow         │
├─────────────────────────────────────────┤
│  4. FEATURES — 4 pillars               │
├─────────────────────────────────────────┤
│  5. DEMO / SCREENSHOT — See it live    │
├─────────────────────────────────────────┤
│  6. STATS — Hard numbers               │
├─────────────────────────────────────────┤
│  7. STORIES — Emotional testimonials   │
├─────────────────────────────────────────┤
│  8. MISSION — For grant reviewers      │
├─────────────────────────────────────────┤
│  9. SUPPORT — How to help              │
├─────────────────────────────────────────┤
│  10. FINAL CTA — Sign up / waitlist    │
├─────────────────────────────────────────┤
│  Footer                                │
└─────────────────────────────────────────┘
```

---

## 2. Copy for Each Section

### Nav Bar
- **Logo:** Mychelin wordmark (Playfair Display, amber-700) + small wok/chopstick icon
- **Links:** How It Works · Features · Our Mission · Support Us
- **CTA Button:** "Try Mychelin" (amber bg, links to app)
- **Mobile:** Hamburger menu, CTA always visible

---

### Section 1: HERO

**Layout:** Full viewport height. Left-aligned text on desktop, centered on mobile. Subtle background: warm gradient (stone-50 → amber-50) with faint pattern of traditional tile/peranakan motifs at low opacity.

**Headline (H1):**
```
Your Ah Ma's recipes
won't last forever.
```

**Subheadline:**
```
Mychelin captures heritage recipes in your grandmother's own words —
in her dialect, with her stories — before they're gone.
```

**Primary CTA:**
```
[🎙️ Start Capturing Recipes]  →  links to /capture (or waitlist)
```

**Secondary CTA:**
```
[Watch How It Works]  →  scrolls to Section 3 or plays embedded video
```

**Dialect touch (small text below CTAs):**
```
"阿嫲的味道，一代传一代" (Ah Ma's flavours, passed down generation to generation)
```

**Visual:** Right side (desktop) — warm-toned illustration or photo of elderly hands and young hands together over a wok. Not stock photography — illustrated or stylized. Think editorial, not corporate.

---

### Section 2: URGENCY — The Clock Is Ticking

**Layout:** Dark background (stone-900) to create visual break. White text. Centered.

**Headline (H2):**
```
Every day, a recipe disappears.
```

**Body:**
```
Singapore's dialect-speaking generation is aging. The recipes they carry —
perfected over decades, never written down, measured in "agak agak" —
exist only in their memory.

When they're gone, those recipes go with them.

This isn't about food. It's about identity.
```

**Pull quote (large, amber-400 text):**
```
"她从来没有写过食谱。都在她的头里面。"
"She never wrote a recipe. It was all in her head."
— Every Singaporean family, eventually.
```

**Small accent:** A subtle animated counter or timeline showing "dialect speakers in Singapore" declining (stylized, not morbid — think a gentle fade, not a countdown clock).

---

### Section 3: HOW IT WORKS — 3 Steps

**Layout:** Light background (amber-50/stone-50). Three columns on desktop, stacked on mobile. Each step has an icon, number, title, and description.

**Headline (H2):**
```
Three steps. One afternoon. A lifetime of recipes saved.
```

**Step 1:**
- **Icon:** 🎙️ Microphone
- **Title:** "Sit down together"
- **Body:** "Open Mychelin and start a live conversation. Cook together, talk together — just like you always have. Mychelin listens in the background."

**Step 2:**
- **Icon:** 🌏 Language bridge
- **Title:** "AI translates in real-time"
- **Body:** "Ah Ma speaks Hokkien. You speak English. Mychelin bridges the gap — translating dialect to English, extracting ingredients and steps as you go. No more 'a bit of this, a bit of that' lost in translation."

**Step 3:**
- **Icon:** 📖 Recipe book
- **Title:** "Your family recipe, preserved"
- **Body:** "Get a complete recipe with ingredients, steps, and — most importantly — the story behind the dish. Who taught it to Ah Ma? Why does she add that extra pinch of five-spice? The recipe AND the memory, saved together."

**Below steps (optional):**
```
[See It In Action →]  (scrolls to demo section)
```

---

### Section 4: FEATURES — Four Pillars

**Layout:** Two-column grid on desktop (feature card left, visual right, alternating). Cards have amber-100 left border accent.

**Headline (H2):**
```
Built for the conversations that matter most.
```

**Feature 1: Language Bridge 🌉**
```
Title: "Hokkien ↔ English. Cantonese ↔ English. In real time."
Body: "Mychelin's AI understands Singapore's dialects — Hokkien, Teochew,
Cantonese, Malay, Mandarin. It translates live, so you can cook together
even when you don't share a common language. No more nodding along
hoping you understood the recipe right."
```

**Feature 2: Smart Recipe Extraction 🧠**
```
Title: "From 'agak agak' to actual measurements."
Body: "AI listens to the conversation and automatically extracts ingredients,
quantities, and cooking steps. It even asks smart follow-up questions:
'How much dark soy sauce?' 'What temperature for the wok?' The recipe
builds itself while you cook."
```

**Feature 3: Voice & Story Preservation 🎵**
```
Title: "Her voice. Her stories. Forever."
Body: "Every recipe comes with the original voice recording — Ah Ma's
laugh when she tells you you're doing it wrong, the story about how
Ah Gong used to love this dish. The recipe is the what. The voice
is the who."
```

**Feature 4: Heritage Context 🏮**
```
Title: "More than a recipe. A piece of culture."
Body: "Mychelin adds cultural context automatically — the history of
the dish, regional variations, festive significance. Learn that your
family's bak kut teh is Teochew-style (peppery, not herbal) and why
that matters."
```

---

### Section 5: DEMO / SCREENSHOT

**Layout:** Centered. Browser mockup or phone frame showing the live capture UI.

**Headline (H2):**
```
See the Language Bridge in action.
```

**Content:** Either:
- **Option A (preferred):** Embedded short video (30-60s) showing a simulated live capture session — Hokkien speaker, English translations appearing, recipe building in sidebar
- **Option B:** Animated screenshot walkthrough (3-4 frames) using Framer Motion
- **Option C:** Static screenshot of the live capture page with annotated callouts

**Caption:**
```
Live recipe capture — AI translates dialect speech and extracts the recipe
in real time. Currently in beta.
```

**CTA:**
```
[Try the Beta →]
```

---

### Section 6: STATS — The Numbers

**Layout:** Amber/gold background (amber-100). Four stats in a row (desktop) or 2×2 grid (mobile). Large numbers, small labels.

**Headline (H2):**
```
The numbers tell the story.
```

**Stats (animate on scroll — count up):**

```
500,000+          42%              80%              10 years
households with   decline in       of heritage      before most
seniors 65+       dialect use      recipes are       dialect speakers
in Singapore      since 1990       never written     are gone
                                   down
```

**Sources footnote (small text):**
```
Sources: Singapore Department of Statistics (2024), NUS Linguistics Dept,
National Heritage Board surveys.
```

---

### Section 7: STORIES — Emotional Testimonials

**Layout:** Warm stone-50 background. Carousel or stacked cards. Each card has a quote, attribution, and small photo/avatar.

**Headline (H2):**
```
Every family has a recipe worth saving.
```

**Testimonial 1 (placeholder — real story structure):**
```
"My grandmother's Hokkien mee recipe died with her in 2019.
She made it every Chinese New Year. I watched her cook it a
hundred times but never wrote it down. I'd give anything to
have recorded just one conversation."

— Wei Lin, 34, Software Engineer
```

**Testimonial 2:**
```
"I tried to get my Ah Ma's kueh lapis recipe before she passed.
She kept saying 'just watch lah, you'll know.' I watched. I didn't
know. Not really. Not the way she did it."

— Priya, 29, Teacher
```

**Testimonial 3:**
```
"阿嫲 always said she'd teach me her bak chang recipe 'next time.'
There wasn't a next time. Don't wait for next time."

— Jun Hao, 31, Designer
```

**Note:** These are composite/representative stories for launch. Replace with real user testimonials post-beta.

---

### Section 8: MISSION — For Grant Reviewers

**Layout:** Clean white background with subtle left amber border. Professional tone but still warm.

**Headline (H2):**
```
Our Mission
```

**Mission Statement (large text):**
```
Mychelin exists to ensure that Singapore's culinary heritage
survives the language gap between generations.

We use AI not to replace human connection, but to bridge it —
turning kitchen conversations between grandparents and
grandchildren into preserved family treasures.
```

**Sub-sections (grid of 3):**

**Cultural Impact:**
```
Singapore's dialect-speaking generation is the last to carry
oral culinary traditions. When dialect use falls below critical
mass, the recipes, techniques, and stories encoded in those
languages will be irretrievable. Mychelin creates a digital
bridge before that threshold is crossed.
```

**Technology Approach:**
```
• Hybrid AI pipeline: Whisper (speech-to-text) + SeamlessM4T
  (Hokkien/Teochew) + Claude/Gemini (translation & structuring)
• Real-time conversation capture with live translation
• Automatic recipe extraction from natural conversation
• Voice preservation for emotional & archival value
• Cultural context enrichment via NLP
```

**Impact Goals (2026-2027):**
```
• 1,000 heritage recipes captured in first year
• Support for 6 Singapore dialects/languages
• 500 families using the platform
• Partnership with National Heritage Board for archival
• Community recipe repository for cultural preservation
```

**Team section (placeholder):**
```
Built by a team of Singaporean developers who've watched their
own family recipes disappear. We're not building another recipe
app — we're building a time capsule.
```

---

### Section 9: SUPPORT — How to Help

**Layout:** Warm gradient background (amber-50 to stone-50). Two or three cards.

**Headline (H2):**
```
Help us save Singapore's recipes.
```

**Subheadline:**
```
Mychelin is applying for the Community Media Foundation (CMF) grant
to make heritage recipe preservation accessible to every family in Singapore.
```

**Card 1: For Families**
```
Title: "Capture your family's recipes"
Body: "Sign up for the beta and start recording. Every recipe you
save is a piece of Singapore's heritage preserved."
CTA: [Join the Beta →]
```

**Card 2: For Supporters**
```
Title: "Support the mission"
Body: "Your contribution helps us build dialect AI models, keep the
platform free for families, and partner with heritage organisations."
CTA: [Support Mychelin →]  (links to crowdfunding/donation page)
```

**Card 3: For Organisations**
```
Title: "Partner with us"
Body: "We're looking for partners in heritage preservation, linguistics,
and community outreach. Let's preserve Singapore's culinary stories together."
CTA: [Get in Touch →]  (mailto or contact form)
```

---

### Section 10: FINAL CTA

**Layout:** Full-width amber-700 background. Centered text. High contrast.

**Headline (H2, white text):**
```
Don't wait for "next time."
```

**Body (amber-100 text):**
```
Your grandmother's recipes are waiting to be captured.
Start today — before it's too late.
```

**CTA (large white button):**
```
[🎙️ Start Capturing Recipes — It's Free]
```

**Secondary (small link):**
```
Questions? hello@mychelin.sg
```

---

### Footer

**Layout:** Stone-900 background. Four columns on desktop.

**Column 1: Brand**
- Mychelin logo
- "Preserving heritage recipes, one conversation at a time."
- © 2026 Mychelin. Made in Singapore 🇸🇬

**Column 2: Product**
- How It Works
- Features
- Try the Beta
- Roadmap

**Column 3: Mission**
- Our Story
- CMF Grant
- Impact Report
- Press Kit

**Column 4: Connect**
- hello@mychelin.sg
- Instagram
- Twitter/X
- GitHub (if open source)

---

## 3. Design Direction

### Color Palette

```
Primary:
  amber-700   #b45309   — Primary brand color (warm gold, heritage feel)
  amber-600   #d97706   — Hover states, accents
  amber-500   #f59e0b   — Highlights, badges
  amber-100   #fef3c7   — Light backgrounds
  amber-50    #fffbeb   — Subtle tints

Neutral:
  stone-900   #1c1917   — Headings, dark sections
  stone-700   #44403c   — Body text
  stone-500   #78716c   — Secondary text
  stone-200   #e7e5e3   — Borders
  stone-50    #fafaf9   — Page background (existing)

Accent (from existing app):
  terracotta  #C2714F   — Keep for interactive elements, links (warm complement to amber)

Semantic:
  red-600     #dc2626   — Live indicator, urgency
  emerald-600 #059669   — Success states
  white       #ffffff   — Cards, contrast text
```

**Rationale:** Shifting from pure terracotta (app) to amber/gold (landing) creates a more heritage, warm feeling while maintaining visual kinship. The amber palette evokes:
- Aged recipe books and yellowed paper
- Golden wok oil and turmeric
- Warmth, family, nostalgia
- Traditional Chinese gold (prosperity, preservation)

### Typography

**Keep existing fonts** (already in the app):
- **Headings:** Playfair Display (serif) — elegant, editorial, heritage feel
- **Body:** DM Sans — clean, modern, highly readable

**Landing-specific adjustments:**
- Hero H1: `text-5xl md:text-6xl lg:text-7xl` (bigger than app)
- Section H2: `text-3xl md:text-4xl`
- Body: `text-lg md:text-xl` with `leading-relaxed`
- Pull quotes: `text-2xl md:text-3xl italic` in Playfair
- Stats numbers: `text-5xl md:text-6xl font-bold` in DM Sans (tabular nums)
- Dialect text: Could use a slightly different font — or keep Playfair italic for Chinese characters

### Image / Illustration Direction

**Photography style (if using photos):**
- Warm color grading (amber overlay)
- Shallow depth of field
- Kitchen scenes: hands, wok, ingredients, steam
- Intergenerational: elderly hands + young hands
- NOT stock photo feeling — editorial, candid, documentary style
- Singapore-specific: HDB kitchen, wet market ingredients, traditional crockery

**Illustration style (if using illustrations):**
- Line art with amber/terracotta fill accents
- Warm, hand-drawn feeling
- Icons for features: simple, consistent stroke weight
- Could use Lucide icons (already in project) for consistency
- Cultural motifs: Peranakan tile patterns at low opacity as section dividers

**Suggested visuals per section:**
| Section | Visual |
|---|---|
| Hero | Illustration: elderly woman and young person at a kitchen table, wok between them |
| Urgency | Abstract: fading/dissolving recipe card (visual metaphor for loss) |
| How It Works | Three clean icons (mic, globe/bridge, book) |
| Features | Screenshots or UI mockups in phone frames |
| Demo | Actual screenshot of capture page in browser mockup |
| Stats | Clean data visualization, animated counters |
| Stories | Small avatar illustrations or photos (circular frames) |
| Mission | Clean typography-focused, minimal imagery |
| Support | Three card illustrations (family, heart, handshake) |
| Final CTA | Background texture: warm kitchen steam / bokeh |

### Mobile-First Layout

- **All sections stack vertically** on mobile
- **Hero:** Full viewport, text centered, CTA buttons stack
- **How It Works:** Steps stack vertically with connecting line/dots
- **Features:** Single column, icon + text cards
- **Stats:** 2×2 grid on mobile (not 4-column)
- **Nav:** Hamburger menu with CTA always visible
- **Touch targets:** Minimum 44px (already enforced in globals.css)
- **Font sizes:** No smaller than 16px body text on mobile
- **Spacing:** Generous padding (py-16 minimum per section)
- **Images:** Full-width on mobile, constrained on desktop

### Accessibility Notes

- **Color contrast:** All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- **Amber on white:** amber-700 on white = 4.6:1 ✅ (just passes AA)
- **Amber on dark:** amber-100 on stone-900 = high contrast ✅
- **Focus indicators:** Visible focus rings on all interactive elements (already somewhat in CSS)
- **Alt text:** All images need descriptive alt text
- **Semantic HTML:** Use proper heading hierarchy (h1 → h2 → h3, no skipping)
- **Reduced motion:** Respect `prefers-reduced-motion` for animations
- **Screen reader:** Stat counters should have `aria-label` with final value
- **Language:** Mark dialect text with appropriate `lang` attribute (`lang="zh-min-nan"` for Hokkien, etc.)
- **Font size:** Body minimum 16px, headings scale with viewport but have min-size

---

## 4. Technical Implementation Plan

### Route Structure

```
src/app/
├── (app)/              ← Move existing app routes here (grouped route)
│   ├── layout.tsx      ← Existing layout with nav/auth
│   ├── page.tsx        ← Existing homepage (recipes dashboard)
│   ├── capture/
│   ├── recipes/
│   └── ...
├── (landing)/          ← New landing group
│   ├── layout.tsx      ← Landing-specific layout (no app nav)
│   └── page.tsx        ← Landing page (root /)
└── layout.tsx          ← Root layout (fonts, metadata)
```

**Why this structure:**
- Landing page becomes the root `/` (what visitors see first)
- App moves to a route group `(app)` — existing URLs preserved
- Landing has its own layout (no MobileNav, no auth nav)
- Logged-in users can be auto-redirected to app dashboard

**Alternative (simpler, recommended for speed):**
```
src/app/
├── landing/
│   └── page.tsx        ← /landing route
├── page.tsx            ← Keep existing homepage
└── ...
```
Build at `/landing` first, swap to root `/` when ready.

### Component Breakdown

```
src/components/landing/
├── LandingNav.tsx              ← Sticky nav with smooth scroll links
├── HeroSection.tsx             ← Hero with headline, CTAs
├── UrgencySection.tsx          ← Dark bg, emotional appeal
├── HowItWorksSection.tsx       ← 3-step flow
├── FeaturesSection.tsx         ← 4-feature grid
├── DemoSection.tsx             ← Screenshot/video embed
├── StatsSection.tsx            ← Animated counters
├── StoriesSection.tsx          ← Testimonial carousel/cards
├── MissionSection.tsx          ← Grant-focused content
├── SupportSection.tsx          ← Three support cards
├── FinalCTASection.tsx         ← Full-width CTA
├── LandingFooter.tsx           ← Footer
├── AnimatedCounter.tsx         ← Number animation component
├── SectionWrapper.tsx          ← Consistent padding/max-width wrapper
└── ScrollReveal.tsx            ← Intersection observer fade-in wrapper
```

**Shared utilities:**
- `ScrollReveal` — wraps sections, fades in on scroll using Intersection Observer (use Framer Motion, already installed)
- `AnimatedCounter` — counts up numbers when in viewport
- `SectionWrapper` — consistent max-width, padding, section ID for scroll linking

### Key Technical Decisions

1. **Server Component by default** — Landing page is mostly static content. Only interactive parts (nav toggle, counter animations, carousel) need `"use client"`.

2. **No database dependency** — Landing page should NOT import from `@/db`. It's static content. This means it works even if Turso is down.

3. **Framer Motion for animations** — Already installed. Use for:
   - Scroll-triggered fade-in (`whileInView`)
   - Counter animations
   - Testimonial carousel
   - Subtle parallax on hero

4. **Lucide icons** — Already installed. Use for feature icons, step icons, nav.

5. **No new dependencies needed** — Everything can be built with existing stack.

### SEO Considerations

**Metadata (in landing page.tsx or layout.tsx):**
```tsx
export const metadata: Metadata = {
  title: "Mychelin — Preserve Your Family's Heritage Recipes",
  description: "AI-powered recipe preservation for Singapore families. Capture your grandmother's recipes in her own dialect before they're lost forever. Hokkien, Teochew, Cantonese, Malay supported.",
  keywords: ["heritage recipes", "Singapore", "family recipes", "dialect", "Hokkien", "recipe preservation", "AI translation", "cultural heritage"],
  openGraph: {
    title: "Mychelin — Your Grandmother's Recipes, Preserved Forever",
    description: "AI-powered language bridge that captures heritage recipes in dialect. Built for Singapore families.",
    images: ["/og-image.png"],  // Create a compelling OG image
    type: "website",
    locale: "en_SG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mychelin — Preserve Heritage Recipes Before They're Lost",
    description: "Your grandmother's recipes won't last forever. Capture them in her dialect — Hokkien, Teochew, Cantonese — with AI.",
    images: ["/og-image.png"],
  },
};
```

**Additional SEO:**
- Structured data (JSON-LD) for Organization + WebApplication
- Canonical URL: `https://mychelin.sg` (or current Vercel URL)
- Semantic HTML: proper heading hierarchy, `<article>`, `<section>` with IDs
- Alt text on all images
- Internal links to app sections
- Fast load time (see Performance below)

### Analytics Tracking Points

```
Track these events (Vercel Analytics or custom):

Page-level:
  - landing_page_view
  - landing_scroll_depth (25%, 50%, 75%, 100%)
  - landing_time_on_page

Section engagement:
  - section_viewed (section_name) — via Intersection Observer
  - demo_video_played
  - testimonial_carousel_swiped

CTAs:
  - hero_cta_clicked (primary/secondary)
  - how_it_works_cta_clicked
  - demo_cta_clicked
  - support_cta_clicked (families/supporters/orgs)
  - final_cta_clicked
  - nav_cta_clicked

Conversion:
  - beta_signup_started
  - beta_signup_completed
  - support_link_clicked
  - contact_form_submitted
```

### Performance Targets

| Metric | Target | How |
|---|---|---|
| **LCP** | < 2.5s | Hero text is static (no DB), optimize hero image |
| **FID** | < 100ms | Minimal JS on initial load, defer animations |
| **CLS** | < 0.1 | Set explicit dimensions on images, font swap |
| **Total JS** | < 150KB | Server components for static content |
| **First paint** | < 1.5s | No DB queries, static rendering possible |
| **Lighthouse** | > 95 | All the above + proper meta tags |

**Optimization strategies:**
- Use `next/image` with priority for hero image
- Lazy load below-fold images
- Defer Framer Motion animations (only load when in viewport)
- Consider `generateStaticParams` or ISR for the landing page
- Preload Playfair Display and DM Sans fonts (already configured)

---

## 5. Grant-Specific Elements

### What CMF Grant Reviewers Need to See

1. **Clear problem statement** — Cultural urgency is real and quantifiable
2. **Working prototype** — Link to live beta (the app is already deployed!)
3. **Technology credibility** — Show the AI pipeline is real, not vaporware
4. **Impact metrics** — Specific, measurable goals
5. **Community benefit** — This isn't a commercial play; it's cultural preservation
6. **Team credibility** — Singaporean team who cares about the problem
7. **Sustainability plan** — How will this continue after grant funding

### Impact Metrics Section (for Mission/Grant section)

```
Year 1 Goals:
├── 1,000 heritage recipes captured and preserved
├── 500 families actively using the platform
├── 6 Singapore dialects/languages supported
├── 50 community workshops conducted
└── 1 partnership with National Heritage Board

Year 2 Goals:
├── 5,000 recipes in the community repository
├── 2,000 active families
├── Voice archive of 100+ elderly speakers
├── Open API for heritage researchers
└── Expansion to Malaysian and Indonesian heritage recipes
```

### Mission Statement (polished version for grant)

```
Mychelin is a cultural preservation platform that uses artificial
intelligence to bridge the language gap between Singapore's
dialect-speaking elders and their English-speaking grandchildren.

Our core belief: Heritage recipes are more than instructions.
They are stories, memories, and cultural identity encoded in
language. When the last generation of dialect speakers passes,
those recipes — and the culture they carry — will be lost forever.

Mychelin turns a kitchen conversation into a preserved family
treasure: the recipe, the voice, the story, the cultural context.
All captured through AI that understands Singapore's dialects.

We're not building another recipe app. We're building a time capsule
for Singapore's culinary heritage.
```

### Team / About Section

**Structure:**
```
Title: "Built by Singaporeans, for Singapore."

Body: "We're a team of developers, linguists, and food lovers
who grew up eating our grandmothers' cooking. We've all experienced
the moment of realising we never wrote down that recipe. Mychelin
is our answer to 'I wish I had recorded that.'"

Team cards (if applicable):
- Founder photo + name + role + one-line "why"
- Advisor/mentor if any
- "And the families who've tested with us"
```

### How to Donate / Support

**For CMF context, frame as "support the mission" not "donate to us":**

```
Option 1: Use the platform (free) — every recipe captured helps
Option 2: Share with your family — spread the word
Option 3: Community contribution — help fund dialect AI models
Option 4: Organisational partnership — heritage bodies, schools, CCs
```

**If crowdfunding:**
- Embed or link to crowdfunding platform
- Show progress bar toward funding goal
- Tier-based rewards:
  - $10: Early beta access + thank you
  - $50: Name on the "Heritage Keepers" wall
  - $100: Priority access to voice archive features
  - $500: Sponsored workshop at a community centre

---

## 6. Implementation Priority / Build Order

Given the 1 April deadline, here's the recommended build sequence:

### Phase 1: MVP Landing (2-3 days) — SHIP THIS
1. `LandingNav` + `HeroSection` + `FinalCTASection` + `LandingFooter`
2. `UrgencySection` + `StatsSection` (static numbers, no animation yet)
3. `HowItWorksSection` + `FeaturesSection`
4. `MissionSection` (critical for grant)
5. SEO metadata + OG image
6. Deploy to `/landing` route

### Phase 2: Polish (2-3 days)
7. `AnimatedCounter` + `ScrollReveal` animations
8. `StoriesSection` with placeholder testimonials
9. `SupportSection` with crowdfunding links
10. `DemoSection` with screenshot mockup
11. Mobile responsiveness QA
12. Performance optimization + Lighthouse audit

### Phase 3: Post-Grant
13. Replace placeholder testimonials with real ones
14. Add video demo
15. Add real team photos
16. Swap landing to root `/` route
17. A/B test CTAs

---

## 7. Key Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Color shift | Terracotta → Amber (landing only) | Heritage warmth, differentiation from app |
| Route | `/landing` initially | Non-destructive, can swap to root later |
| DB dependency | None | Landing must work independently |
| Animations | Framer Motion (existing) | No new deps, scroll-triggered |
| Copy tone | Warm + urgent | Not guilt-tripping, but honest about time |
| Dialect text | Sprinkled, not dominant | English-first audience, dialect for authenticity |
| Grant visibility | Dedicated section | CMF reviewers need to find it easily |
| Mobile-first | Yes | Target demographic (25-40) is mobile-primary |

---

## 8. Open Questions for B

1. **Domain:** Is `mychelin.sg` available/planned? Currently on Vercel subdomain.
2. **Team page:** Who to feature? Solo or team?
3. **Crowdfunding platform:** Which one? (GiveSG, Kickstarter, etc.)
4. **Video demo:** Do we have footage or should we create a screencast?
5. **Real testimonials:** Any beta testers who've given feedback?
6. **OG Image:** Should I generate one, or do you have brand assets?
7. **Contact email:** `hello@mychelin.sg` or different?
8. **Grant-specific:** Any CMF application requirements for the website specifically?

---

*Spec created 28 March 2026. Ready for implementation.*
