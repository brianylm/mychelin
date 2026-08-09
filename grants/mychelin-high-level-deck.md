# Mychelin — High-Level Deck

A reusable pitch/strategy deck for investors, heritage partners, grant bodies, and early collaborators.

- **Live product:** https://mychelin-sg.vercel.app
- **Repo:** https://github.com/brianylm/mychelin
- **Status:** Live PWA, active pilot development, open-source (MIT)

---

## Slide 1 — Title

# Mychelin

### Preserve the taste of home.

A Singapore-first mobile PWA that turns family food conversations into durable, shareable, cookable heirlooms.

---

## Slide 2 — The Problem in One Sentence

> Moving out means missing home cooking — and when grandparents pass on, their recipes often go with them.

### What is actually broken

1. **Oral recipes die.** Most Singapore family recipes live in memory, not paper — passed down in Hokkien, Teochew, Cantonese, Malay, Tamil, or mixed "Singlish." When the older cook is gone, the dish is gone.
2. **Younger cooks are stranded.** They want to cook what they grew up with, but "agak-agak," "until fragrant," and "listen to the wok" do not translate into usable instructions.
3. **Weekly cooking is exhausting.** Decision fatigue, missing ingredients, and bad recipe apps push people back to delivery — and the taste of home fades.
4. **Generic recipe apps are wrong.** They optimize for clicks and ad impressions, not for heritage accuracy, dialect, or the story behind the dish.

---

## Slide 3 — The Opportunity

### A generational transfer is happening now

- Singapore's pioneer / Merdeka-generation cooks are aging.
- Young adults are moving out earlier and cooking for themselves later.
- Families are spread across households, countries, and languages.
- There is no trusted, privacy-respecting tool built specifically for Singapore family food heritage.

### The wedge

The biggest unmet need is not "more recipes." It is **capturing the ones that are about to disappear** and making them actually cookable by the next generation.

---

## Slide 4 — The Product

### Mychelin helps families do three things

1. **Capture** — Record recipes from voice conversations, pasted notes, photos of handwritten cards, or URLs. AI extracts structure but preserves uncertainty ("agak-agak") and dialect terms.
2. **Cook** — Turn saved recipes into practical meal plans, shopping lists, and a large-step "Cook with Me" mode designed for the kitchen.
3. **Preserve** — Build family recipe books, track versions and attempts, and keep voices, stories, and provenance alongside the dish.

### Core loop

```
Capture / create a recipe
        ↓
   Plan when to cook
        ↓
   Generate shopping list
        ↓
   Cook with guided steps
        ↓
   Record what worked
        ↓
   Promote improvements into the recipe
        ↓
   Share the book
```

Each loop makes the recipe more reliable and more "like home" over time.

---

## Slide 5 — What Makes It Different

| Typical recipe app | Mychelin |
|-------------------|----------|
| Optimized for content volume | Optimized for accuracy and trust |
| Static recipe cards | Living recipes with versions, attempts, and notes |
| English-first, metric-only | Dialect-friendly, preserves original phrasing |
| Forces rigid forms | Conversation-first capture, accepts "agak-agak" |
| Ad-supported or subscription walls | Public-good mission; sustainable hosted model later |
| Generic social features | Family books and private sharing by default |

### Key differentiators

- **Heritage-first data model:** original dialect, sensory cues, substitutions, family story, provenance.
- **Uncertainty-aware AI:** does not hallucinate precision where the cook said "a little while."
- **Kitchen ergonomics:** large steps, timers, one-handed mobile PWA, senior-friendly flows.
- **Trust and privacy:** family books, private sharing, consent-aware voice recording.

---

## Slide 6 — Live Product Snapshot

### What already works

- ✅ PWA installable on mobile; service worker for offline app shell.
- ✅ AI-assisted recipe capture from conversation, paste, URL, and manual entry.
- ✅ Voice recording with transcript storage and privacy/consent UX.
- ✅ Structured recipe workspace: ingredients, steps, timings, photos, versions.
- ✅ Family recipe books with member invitations.
- ✅ Meal planning with calendar export.
- ✅ Shopping list generation.
- ✅ Cook-with-me mode with attempt notes.
- ✅ Auth, sharing permissions, public share pages.
- ✅ Open-source under MIT.

### Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS + Radix UI
- Turso/libSQL + Drizzle ORM
- Vercel Blob for media
- OpenAI / Whisper / Realtime for speech; DeepSeek for text reasoning

---

## Slide 7 — Target Users

### Primary: moved-out homecooks starting a new nest

- Ages 25–40.
- Living away from parents/grandparents.
- Want to cook the food they grew up with.
- Pain: does not know what to cook, how to cook it, or what to buy.

### Secondary: older family cooks preserving and sharing

- Ages 55+.
- Want to pass recipes down without writing them down.
- Pain: explaining over the phone repeatedly; no durable record.

### Tertiary: heritage organisations, schools, community groups

- Want to document local food traditions.
- Need a privacy-respecting, open-source tool they can adapt.

---

## Slide 8 — Go-to-Market Wedge

### Do not launch as a generic AI recipe app.

Launch with a narrow, repeatable wedge:

> **"Tell Mychelin what is in your fridge. Get dinner in 60 seconds."**

### Phase 1: Fridge / Pantry Rescue

- Target: busy homecooks with decision fatigue.
- Channel: parent groups, office chats, Reddit cooking/budget communities.
- Test: concierge MVP — send a fridge photo or voice note, get a dinner plan in 5 minutes.
- Pass signal: 30%+ make a second request within 7 days.

### Phase 2: Voice Kitchen Copilot

- Hands-free cooking help for substitutions, next steps, timers, "is this done?"
- First test: 3 interactive voice-guided recipes with one creator.
- Pass signal: 25% try voice; 15% complete a session.

### Phase 3: Heritage Capture Workshops

- Partner with charities, community centres, and schools.
- Run "Capture Ah Ma's recipe" sessions.
- Build a public archive of Singapore food heritage.

---

## Slide 9 — Business Model

### Today

- Free, open-source PWA.
- Costs covered by founder + grant / partnership opportunities.
- Mission: preserve heritage, prove the loop, build trust.

### Future sustainable options

1. **Hosted premium plans** for families who want more storage, voice minutes, advanced meal-planning, or private household collaboration.
2. **Heritage organisation licences** for schools, community groups, and national bodies that need a branded, managed instance.
3. **Community heritage kits** — workshop materials, printed family cookbooks, archive exports.
4. **Optional integrations** — grocery APIs, calendar services, nutrition exports.

### Principle

The core preservation workflow stays free and open-source. Revenue options support the mission without walling it off.

---

## Slide 10 — Roadmap

### Near term (now — 3 months)

- Mobile landing hero readability and onboarding goal flow.
- Whisper/OpenAI transcription fallback reliability.
- First-recipe guided mission and sample recipe sandbox.
- Households: shared meal plan, inventory, and shopping list.
- Cooking Card / timeline view for recipe reading.
- Privacy-safe demo data and pilot runbook.

### Medium term (3–9 months)

- Recipe photo / OCR import path.
- Pantry/fridge-aware recipe suggestions.
- Pantry Rescue positioning and concierge pilot.
- Push notifications for prep windows and expiry alerts.
- Nutrition estimates and fitness-tracker export.
- Account deletion, data export, and compliance hardening.

### Long term (9–24 months)

- Community heritage capture workshops and school kits.
- Curated family cookbook and archive export formats.
- Sustainable hosted model with premium tiers.

---

## Slide 11 — Why Now

| Driver | Why it matters |
|--------|----------------|
| AI speech-to-text is finally usable for dialect and mixed-language conversation. | Makes real-time, conversation-first capture possible. |
| Mobile PWAs are good enough for kitchen use. | One-handed, installable, no app-store gatekeeping. |
| Singapore heritage funding is active. | Cultural Matching Fund, NHB Heritage Plan 2.0, community centre networks. |
| Pioneer generation is aging. | Window to capture oral recipes is closing. |
| Younger cooks are time-poor and lonely for home food. | Ready to adopt tools that reduce friction. |

---

## Slide 12 — Traction & Validation

### Current status

- Product live at https://mychelin-sg.vercel.app.
- Open-source repo with clean commit history and deployment pipeline.
- Design audit completed (May 2026) — activation and retention gaps identified.
- Wide-angle product backlog captured — 7 prioritized feature concepts.
- GTM wedge defined: Fridge/Pantry Rescue + Voice Kitchen Copilot.

### What we still need to measure

- Signup → first recipe created within 24h.
- Recipe creation abandonment rate.
- Share links created per active user.
- Weekly active return rate.
- Meal plan usage rate.

> Recommendation: add lightweight analytics instrumentation before the pilot so decisions are evidence-based.

---

## Slide 13 — The Ask

### What we are looking for

1. **Pilot users and community partners** — families, community centres, heritage charities, schools willing to run a 4-week capture-and-cook pilot.
2. **Grant / program alignment** — cultural matching, heritage preservation, intergenerational, or food security programs.
3. **Advisory input** — on Singapore heritage partnerships, food-media distribution, and sustainable nonprofit/commercial models.

### What we offer in return

- A free, open-source, privacy-aware tool aligned with your mission.
- A co-branded pilot with transparent metrics.
- A growing archive of captured Singapore food heritage.

---

## Slide 14 — Closing

> The best Singapore recipes are not in cookbooks. They are in WhatsApp voice notes, phone calls, and Sunday dinners.
>
> Mychelin turns those conversations into something the next generation can actually cook.

### Next step

30-minute conversation. Demo live. Pilot ready.

**https://mychelin-sg.vercel.app**

---

## Appendix — Key Documents

- `README.md` — public overview and local setup.
- `ROADMAP.md` — detailed product roadmap.
- `app/DESIGN-AUDIT.md` — UX gaps and priority matrix.
- `memory/projects/mychelin.md` — project context and recent milestones.
- `memory/ideas/mychelin-wildcard-product-backlog.md` — prioritized feature backlog.
- `memory/projects/mychelin-gtm-2026-06-14.md` — GTM plan and wedge.
- `grants/CHARITY-PARTNERSHIP-PITCH.md` — 1-page charity partnership letter.

---

## Appendix — One-Paragraph Summary

Mychelin is a Singapore-first mobile PWA that preserves family food heritage by turning oral recipes, voice conversations, and handwritten notes into structured, cookable, shareable recipe books. It is designed for moved-out homecooks who want to cook the food they grew up with and for older family cooks who want to pass recipes down without writing them down. Unlike generic recipe apps, Mychelin preserves dialect, uncertainty ("agak-agak"), sensory cues, and family stories; it combines AI-assisted capture with practical cooking tools including meal planning, shopping lists, and a kitchen-friendly "Cook with Me" mode. The product is live, open-source under MIT, and currently focused on pilot onboarding, transcription reliability, and heritage-partnership pilots.
