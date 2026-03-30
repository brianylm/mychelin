# Mychelin — Comprehensive Business Model
## Heritage Recipe Preservation Platform for Singapore & Southeast Asia

**Version:** 1.0 | **Date:** March 2026 | **Stage:** MVP Live, Pre-Grant

---

## Executive Summary

Mychelin is an AI-powered heritage recipe preservation platform that bridges generational and linguistic gaps in Singapore's rapidly aging society. The killer feature — an AI Language Bridge translating between Chinese/Malay dialects and English — addresses a problem no competitor touches. With 20.7% of Singapore's population aged 65+ (and rising to 24% by 2030), there is a narrow, urgent window to capture culinary heritage before it is lost forever.

**The opportunity:** A niche heritage-tech platform that can bootstrap profitably in Singapore, expand across Southeast Asia (where identical dialect-preservation needs exist in Malaysia, Indonesia, Thailand, Philippines), and build an irreplicable cultural data moat.

**Live product:** https://mychelin-1.vercel.app

---

## 1. Revenue Model at Scale

### 1.1 Pricing Tiers

| Tier | Price (SGD/mo) | Target User | Key Features |
|------|----------------|-------------|--------------|
| **Free** | $0 | Casual users, trial | 5 recipes, basic text entry, view community recipes, no AI Language Bridge |
| **Cook** | $6.90/mo ($69/yr) | Active home cooks | Unlimited recipes, AI Language Bridge (10 sessions/mo), photo uploads, family sharing (up to 5 members), basic cookbook export |
| **Heritage** | $12.90/mo ($129/yr) | Families preserving heritage | Everything in Cook + unlimited AI Language Bridge, video/audio recording, multimedia stories, cultural context tagging, premium cookbook export, priority support |
| **Community** | $49/mo | Community centers, churches, temples, schools | Up to 50 contributor accounts, community cookbook, event/workshop tools, branded collection page, admin dashboard |
| **Enterprise/Institutional** | Custom ($200-500/mo) | NHB, museums, cultural orgs, publishers | API access, white-label, bulk data export, research tools, dedicated support, custom integrations |

### 1.2 Revenue Streams (Beyond Subscriptions)

| Stream | Description | Revenue Estimate |
|--------|-------------|-----------------|
| **Subscriptions** | Core SaaS revenue | 60% of total |
| **Printed Cookbook Export** | AI-formatted family cookbooks, printed on demand via partnership (Lulu, Blurb, or local printer) | $19.90-$39.90/book, ~40% margin → ~$8-16 profit/book |
| **Heritage Cookbook Collections** | Curated themed collections (e.g., "Teochew Favourites," "Peranakan Classics") sold as premium digital/physical products | $14.90-$24.90/collection |
| **Workshop Facilitation Fees** | Platform + facilitator tools for community centers running "Record Grandma's Recipes" workshops | $5-10/participant commission |
| **Institutional Licensing** | NHB/museum archive access, research datasets (anonymized), educational licensing | $5K-50K/year per institution |
| **Sponsored Heritage Campaigns** | Brands (e.g., Lee Kum Kee, Yeo's, FairPrice) sponsor recipe preservation campaigns | $5K-20K per campaign |
| **API/Data Licensing** | Anonymized dialect-recipe translation pairs for NLP research; cultural data for academic institutions | $10K-100K/year |

### 1.3 Blended ARPU Estimates

| Scenario | Free:Paid Ratio | Blended Monthly ARPU |
|----------|----------------|---------------------|
| Early (Year 1) | 80:20 | $1.80 |
| Growth (Year 2-3) | 70:30 | $3.20 |
| Mature (Year 4-5) | 60:40 | $5.50 |

### 1.4 Path to Profitability

- **Break-even point:** ~2,500 paid subscribers (or ~8,000 total users at 30% conversion)
- **Timeline:** Month 18-24 at base case growth
- **Key driver:** Subscription revenue covers infra + AI costs by ~1,500 paid users; break-even includes team costs at 2,500

---

## 2. Unit Economics

### 2.1 Cost Per User (Monthly)

**AI API Costs (the critical variable):**

| AI Service | Provider | Cost per Use | Est. Uses/Active User/Mo | Monthly Cost/User |
|------------|----------|-------------|--------------------------|-------------------|
| Dialect → English Translation (text) | Gemini 2.5 Flash | ~$0.003/request (avg 1K input + 500 output tokens) | 8 | $0.024 |
| Speech-to-Text (audio recording) | Google Cloud STT | $0.024/min (V2 Chirp) | 5 min | $0.12 |
| Image/Recipe OCR (Gemini Vision) | Gemini 2.5 Flash | ~$0.005/image | 3 | $0.015 |
| Recipe Structuring/Formatting | Gemini 2.5 Flash | ~$0.004/request | 5 | $0.02 |
| Cookbook PDF Generation | Server-side | ~$0.01/book (amortized) | 0.1 | $0.001 |

**Infrastructure Costs:**

| Service | Plan | Monthly Cost | Cost per 1K Users |
|---------|------|-------------|-------------------|
| Vercel (Hosting) | Pro | $20/mo base + usage | $0.03/user |
| Turso (Database) | Scaler | $29/mo | $0.03/user |
| Cloudflare R2 (Media Storage) | Pay-as-you-go | $0.015/GB-mo, free egress | $0.02/user (avg 1.5GB) |
| Domain + misc | — | $15/mo | $0.015/user |

**Total Cost Per Active User Per Month:**

| User Type | AI Costs | Infra Costs | Total |
|-----------|----------|-------------|-------|
| Free user (minimal AI) | $0.01 | $0.04 | $0.05 |
| Cook tier (moderate AI) | $0.12 | $0.06 | $0.18 |
| Heritage tier (heavy AI) | $0.25 | $0.08 | $0.33 |
| Blended average | $0.10 | $0.06 | $0.16 |

### 2.2 Customer Acquisition Cost (CAC)

| Channel | Est. CAC | Notes |
|---------|----------|-------|
| Organic/SEO/PR | $0 | Heritage stories are inherently shareable |
| Community center partnerships | $2-5 | Workshop costs shared; high conversion |
| Social media (Facebook/Instagram/TikTok) | $8-15 | Target: 40-60 age group, SG-focused |
| Google Ads | $12-20 | "Family recipe" keywords, modest volume |
| Referral program | $3-5 | Free month for referrer + referee |
| **Blended CAC (Year 1-2)** | **$5-8** | Heavy organic + partnerships |
| **Blended CAC (at scale)** | **$10-15** | More paid acquisition needed |

### 2.3 Lifetime Value (LTV)

| Tier | Monthly Revenue | Avg Lifespan | Gross Margin | LTV |
|------|----------------|--------------|-------------|-----|
| Cook ($6.90) | $6.90 | 24 months | 97% | $160 |
| Heritage ($12.90) | $12.90 | 36 months | 97% | $450 |
| Community ($49) | $49.00 | 24 months | 95% | $1,117 |
| **Blended (paid users)** | **$9.50** | **28 months** | **97%** | **$258** |

> **Heritage preservation is sticky by nature.** Once a family archives 20+ recipes with stories and audio, switching costs are extremely high. Expect above-average retention.

### 2.4 LTV:CAC Ratio

| Stage | LTV | CAC | LTV:CAC |
|-------|-----|-----|---------|
| Early (organic-heavy) | $258 | $5 | **51:1** ⭐ |
| Growth (blended) | $258 | $10 | **26:1** ⭐ |
| Scale (more paid) | $258 | $15 | **17:1** ✅ |

> Industry benchmark: 3:1 is healthy. Anything above 5:1 is excellent. Mychelin's heritage stickiness + low-cost acquisition channels make this exceptional.

### 2.5 Gross Margins at Scale

| Scale | Monthly Revenue | AI + Infra Costs | Gross Margin |
|-------|----------------|-------------------|-------------|
| 100 users (20 paid) | $190 | $80 | **58%** (fixed costs dominate) |
| 1,000 users (250 paid) | $2,375 | $224 | **91%** |
| 10,000 users (3,000 paid) | $28,500 | $2,060 | **93%** |
| 100,000 users (35,000 paid) | $332,500 | $19,600 | **94%** |

> At scale, AI API costs are the primary variable cost. Gemini Flash's low pricing ($0.30/1M input tokens) is a structural advantage — AI costs stay under 6% of revenue.

---

## 3. Growth Strategy

### 3.1 Singapore Market Sizing

| Metric | Number | Source |
|--------|--------|--------|
| Total resident population | 4.15M | SingStat 2025 |
| Residents aged 65+ | ~860K (20.7%) | SingStat 2025 |
| Resident households | ~1.37M | SingStat |
| Households with 65+ member | ~500K-550K | Est. based on aging data |
| Dialect-speaking elderly (Hokkien, Teochew, Cantonese, Hakka, etc.) | ~400K+ | Census language data |
| **TAM (Total Addressable Market)** | **500K households** | Families with elderly dialect speakers |
| **SAM (Serviceable)** | **150K households** | Digitally-connected families with interest |
| **SOM (Obtainable, 5 year)** | **15K-30K users** | 10-20% of SAM |

### 3.2 Penetration Targets

| Timeline | Users (Total) | Paid Users | Market Penetration (of SAM) |
|----------|--------------|------------|---------------------------|
| Year 1 | 2,000 | 400 | 1.3% |
| Year 2 | 8,000 | 2,000 | 5.3% |
| Year 3 | 20,000 | 6,000 | 13% |
| Year 4 | 50,000 | 17,500 | 33% (incl. SEA) |
| Year 5 | 120,000 | 42,000 | SEA expansion drives growth |

### 3.3 Go-to-Market Channels

**Phase 1: Community-Led (Months 1-12)**
1. **Community Centers (CCs)** — Singapore has 108 CCs under People's Association. Partner with 10-20 for "Record Grandma's Recipes" workshops. Low cost, high trust, perfect demographic.
2. **Religious Organizations** — Churches, temples, mosques all run community cooking events. Offer free Community tier during partnership.
3. **Schools** — Mother Tongue language programs at primary/secondary level. Heritage recipe project as curriculum-adjacent activity.
4. **Senior Activity Centers (SACs)** — 147 SACs island-wide. Direct access to elderly demographic + their families.

**Phase 2: Digital + Viral (Months 6-18)**
5. **Social Media Content** — TikTok/Instagram Reels: "Watch AI translate Ah Ma's Hokkien recipe in real-time." Inherently viral format.
6. **PR / Heritage Stories** — Pitch human-interest stories to CNA, Mothership, The Straits Times. "We're losing 1,000 recipes a year as elderly pass on."
7. **Food Blogger Partnerships** — Singapore's food scene is massive. Partner with heritage-focused bloggers (Miss Tam Chiak, Seth Lui, ieatishootipost).
8. **SEO** — Target "how to make [traditional dish]," "grandmother recipe Singapore," etc.

**Phase 3: Institutional + Enterprise (Months 12-24)**
9. **NHB Partnership** — Position as digital preservation infrastructure. Align with NHB's Intangible Cultural Heritage (ICH) initiatives.
10. **Museum Collaborations** — Peranakan Museum, Malay Heritage Centre, Chinese Heritage Centre — all potential institutional customers.
11. **Publisher Partnerships** — Work with Epigram Books, Marshall Cavendish (Singapore publishers) on heritage cookbook series.

### 3.4 Viral Loops

| Loop | Mechanism | Viral Coefficient Est. |
|------|-----------|----------------------|
| **Family Sharing** | Every heritage user invites 2-5 family members to view/contribute recipes | 1.5-2.0x |
| **Community Cookbooks** | Community center creates cookbook → shared with 50-200 participants | 3-5x per org |
| **"Ask Ah Ma" Campaign** | Social media prompt: record one recipe, share the before/after (dialect → English) | 1.2-1.5x |
| **Printed Cookbook Gifts** | Physical cookbook given to family → QR code back to platform | 0.3-0.5x |
| **Recipe Sharing** | Individual recipes shared on social/WhatsApp with attribution | 1.1x |

> **Key insight:** Heritage preservation is inherently multi-generational. Each elderly user connects 3-5 younger family members. This is rare organic virality.

### 3.5 SEA Expansion Path

| Market | Population 65+ | Dialect Preservation Need | Timeline | Notes |
|--------|---------------|--------------------------|----------|-------|
| **Malaysia** | 3.5M (10%) | Hokkien, Cantonese, Hakka, Tamil | Year 2-3 | Closest cultural match, same dialects, English common |
| **Indonesia** | 18M (7%) | Javanese, Sundanese, Minang, Chinese dialects | Year 3-4 | Massive market, Bahasa Indonesia bridge needed |
| **Thailand** | 13M (19%) | Teochew, Thai regional, Isan | Year 3-4 | Large Teochew Chinese community |
| **Philippines** | 6M (6%) | Hokkien, regional Filipino languages | Year 4-5 | English-speaking, lower urgency |

**SEA TAM:** 40M+ elderly across these markets. Even 0.1% penetration = 40K users.

---

## 4. Cost Structure at Scale

### 4.1 Operating Cost Breakdown

| Cost Category | 1K Users | 10K Users | 100K Users |
|---------------|----------|-----------|------------|
| **Vercel Hosting** | $20/mo | $50/mo | $300/mo |
| **Turso Database** | $29/mo | $79/mo (Pro) | $500/mo (Enterprise) |
| **Cloudflare R2 Storage** | $22/mo (1.5TB) | $225/mo (15TB) | $2,250/mo (150TB) |
| **Gemini AI APIs** | $100/mo | $800/mo | $6,000/mo |
| **Google Cloud STT** | $60/mo | $500/mo | $4,000/mo |
| **Domain + SSL + misc** | $15/mo | $30/mo | $100/mo |
| **Total Infrastructure** | **$246/mo** | **$1,684/mo** | **$13,150/mo** |
| | | | |
| **Founder salary** | $0 (bootstrapped) | $5,000/mo | $15,000/mo |
| **Engineer #1** | — | $4,000/mo | $7,000/mo |
| **Designer/Marketer** | — | — | $5,000/mo |
| **Community Manager** | — | $2,000/mo (part-time) | $4,000/mo |
| **Total Team** | **$0** | **$11,000/mo** | **$31,000/mo** |
| | | | |
| **Marketing** | $200/mo | $2,000/mo | $15,000/mo |
| **Legal/Accounting** | $100/mo | $500/mo | $2,000/mo |
| **Total Operating** | **$546/mo** | **$15,184/mo** | **$61,150/mo** |

### 4.2 AI Cost Deep Dive (Critical)

The Language Bridge is the core differentiator but also the primary cost driver:

| AI Operation | Cost/Call | Calls/Mo at 10K Users | Monthly Cost |
|-------------|----------|----------------------|-------------|
| Dialect text translation | $0.003 | 24,000 | $72 |
| Speech-to-text (dialect audio) | $0.024/min × avg 2min | 15,000 sessions | $720 |
| Gemini Vision (recipe photos) | $0.005 | 9,000 | $45 |
| Recipe structuring | $0.004 | 15,000 | $60 |
| **Total AI** | | | **$897/mo** |

**Cost optimization strategies:**
1. **Caching:** Common phrases/ingredients cached → reduces repeat API calls by 30-40%
2. **Batch processing:** Queue non-urgent translations for off-peak processing
3. **Model tiering:** Use Flash-Lite ($0.10/1M tokens) for simple tasks, Flash for complex
4. **On-device STT:** For basic transcription, use browser Web Speech API (free) with Gemini for dialect-specific refinement only
5. **Usage limits on Free tier:** No AI Language Bridge on Free → zero AI cost for 60-80% of users

### 4.3 When to Hire

| Milestone | Hire | Role | Monthly Cost (SGD) |
|-----------|------|------|--------------------|
| 500 paid users | Community Manager (PT) | Workshops, partnerships, social | $2,000 |
| 1,500 paid users | Full-stack Engineer | Feature dev, scaling, mobile | $5,000 |
| 3,000 paid users | Founder salary | B takes salary | $5,000 |
| 5,000 paid users | Designer/Marketer | Brand, growth, content | $4,500 |
| 10,000 paid users | 2nd Engineer | SEA localization, mobile app | $5,500 |
| 20,000 paid users | Head of Partnerships | Institutional, enterprise | $6,000 |

---

## 5. Funding Path

### 5.1 Timeline: Bootstrap → Grants → Seed → Series A

```
2026 Q2     → CMF Grant Application (April 1 window)
2026 Q2-Q4  → Bootstrap: MVP refinement, first 500 users
2026 Q3     → NHB Heritage Research Grant application
2026 Q4     → IMDA Open Innovation Platform submission
2027 Q1     → Apply for Enterprise Singapore Startup SG Founder grant
2027 Q1-Q2  → Angel round (if needed, or skip with grant success)
2027 H2     → 2,000+ paid users → approach seed investors
2028 Q1     → Seed round ($500K-$1M)
2029 Q2     → Series A ($3-5M, if SEA expansion warrants)
```

### 5.2 Grant Strategy (Detailed)

| Grant | Agency | Amount | Eligibility | Window | Mychelin Fit |
|-------|--------|--------|-------------|--------|-------------|
| **Cultural Matching Fund (CMF)** | MCCY | 1:1 match up to amount raised, from $100M pool | Arts & Heritage Charities/IPCs | **1 Apr – 31 May 2026** | ⭐⭐⭐⭐⭐ Direct heritage preservation. Need IPC/charity partner. |
| **Heritage Research Grant** | NHB | Up to $50K/project | Researchers, orgs, individuals | Rolling (annual cycles) | ⭐⭐⭐⭐ ICH research angle: documenting dialect food heritage |
| **Startup SG Founder** | Enterprise SG | $50K (with $20K co-investment) | First-time entrepreneurs | Rolling | ⭐⭐⭐⭐ Tech startup grant, straightforward |
| **IMDA Open Innovation Platform** | IMDA | Problem-statement based, $50-250K | Tech companies solving stated problems | Periodic challenges | ⭐⭐⭐ Need to match a challenge brief |
| **IMDA SPARK** | IMDA | Up to $70K | Pre-revenue tech startups | Rolling | ⭐⭐⭐⭐ Good fit for AI/tech angle |
| **NHB Heritage Activation Grant** | NHB | Up to $20K | Community heritage projects | Rolling | ⭐⭐⭐⭐ Community cookbook workshops |
| **SG60 Matching Grants** | Various | Varies | Community projects aligned with SG60 | 2025-2026 | ⭐⭐⭐ Cultural identity angle |
| **MSF Community Bond** | MSF | Up to $50K | Community-building projects | Periodic | ⭐⭐⭐ Intergenerational bonding angle |

### 5.3 Funding Stage Milestones

| Stage | Capital | Source | Runway | Milestone to Unlock |
|-------|---------|--------|--------|-------------------|
| **Bootstrap** | $0-5K | Personal savings | 6-12 months | MVP live, first 100 users |
| **Grants** | $50-150K | CMF + NHB + Startup SG | 12-18 months | 500 users, community partnerships, press |
| **Angel** | $100-300K | SG angel investors | 12 months | 1,000+ users, clear retention, revenue |
| **Seed** | $500K-1M | VC (Antler, Iterative, Golden Gate) | 18-24 months | 5K+ users, $15K+ MRR, SEA validation |
| **Series A** | $3-5M | Regional VC | 24-36 months | 50K+ users, SEA launched, $100K+ MRR |

### 5.4 CMF Grant Strategy (Immediate Priority)

The CMF requires an **Arts & Heritage Charity or IPC** as applicant. Options:
1. **Partner with existing IPC** — e.g., Singapore Heritage Society, Peranakan Association, Chinese clan associations (Hokkien Huay Kuan, Teochew Poit Ip Huay Kuan)
2. **NHB as institutional sponsor** — NHB can co-sponsor heritage digitization projects
3. **Register own entity** — Longer-term, register a cultural preservation non-profit (takes 3-6 months)

**Recommended:** Approach a Chinese clan association. They have IPC status, direct access to dialect-speaking elderly, and institutional credibility. Offer them free Community tier + co-branded cookbook series in exchange for CMF partnership.

---

## 6. Competitive Moat

### 6.1 Why Competitors Can't Copy This

| Competitor | What They Do | Why They Won't/Can't Enter Heritage Space |
|------------|-------------|------------------------------------------|
| **Paprika** ($5/one-time) | Recipe organizer, web clipper | US-focused, no cultural context, no AI, no dialect support, no multimedia heritage. Recipe is data to them, not culture. |
| **Plan to Eat** ($5.95/mo) | Meal planning + recipe storage | Meal planning focus. Heritage preservation is orthogonal to their roadmap. |
| **Recipe Keeper** ($10/one-time) | Cross-platform recipe manager | Utility app. No community, no AI, no cultural dimension. |
| **Heritage Cookbook** ($34.95/book) | Print cookbook creation | Print-only, no digital preservation, no AI, no dialect support. |
| **Recipe Memory** (free) | Simple family recipe sharing | Basic, no AI, no multimedia, no cultural context. Abandoned product feel. |

**The fundamental barrier:** Heritage recipe preservation requires deep cultural context (dialect linguistics, food anthropology, Southeast Asian culinary traditions). This isn't a feature you bolt on — it's a worldview you build a product around.

### 6.2 Moat Layers (Deepening Over Time)

```
Layer 1: TECHNOLOGY MOAT (Year 1)
├── AI Language Bridge (dialect ↔ English) — no competitor has this
├── Multi-modal capture (text + audio + photo + video)
└── Structured heritage metadata (cultural context, family stories, occasions)

Layer 2: DATA MOAT (Year 2-3)
├── Largest structured database of Southeast Asian heritage recipes
├── Dialect-English translation pairs (valuable NLP training data)
├── Audio recordings of elderly cooking narrations (irreplaceable)
└── Cultural metadata: family stories, regional variations, occasion contexts

Layer 3: NETWORK EFFECTS (Year 2-4)
├── Family networks: each user brings 3-5 family members
├── Community collections: recipes gain value in context of community
├── Cross-family discovery: "Other Teochew families also make this..."
└── Contributor reputation: prolific grandmothers become heritage celebrities

Layer 4: INSTITUTIONAL MOAT (Year 2-5)
├── NHB partnership → official heritage digitization platform
├── School curriculum integration → embedded in education system
├── Community center partnerships → physical distribution locked in
└── Government grant track record → credibility for future funding

Layer 5: CULTURAL AUTHENTICITY (Permanent)
├── Built by Singaporeans, for Singaporean families
├── Deep understanding of dialect nuances (Hokkien ≠ Teochew ≠ Cantonese)
├── Community trust earned through years of presence
└── A Silicon Valley competitor cannot fake this
```

### 6.3 The Irreplaceability Factor

**Every day that passes, data is permanently lost.** Singapore's dialect-speaking elderly are aging. The audio recordings, the stories, the cultural context captured on Mychelin in 2026-2030 can never be recreated. This creates an **asset that appreciates in cultural value over time** — the opposite of most tech products.

A competitor launching in 2030 will find that the most valuable heritage data has already been captured and locked in Mychelin's platform.

---

## 7. Risk Analysis

### 7.1 What Kills This Business?

| Risk | Severity | Probability | Impact |
|------|----------|------------|--------|
| **Elderly don't adopt tech** | High | Medium | Users can't onboard independently |
| **AI costs spike** | Medium | Low | Margin compression |
| **Google deprecates Gemini Flash** | Medium | Low | Must migrate to alternative |
| **Low willingness to pay** | High | Medium | Free tier dominates, revenue anemic |
| **Founder burnout (solo)** | High | Medium | Everything stops |
| **Big tech enters space** | Low | Very Low | Google/Apple "Heritage" feature |
| **Cultural sensitivity incident** | Medium | Low | AI mistranslates something offensive |
| **Grant applications fail** | Medium | Medium | Slower growth, but survivable |
| **Privacy/data breach** | Critical | Low | Family data is deeply personal |

### 7.2 Detailed Risk Mitigation

**Risk: Elderly don't adopt tech**
- **Mitigation:** The elderly person is NOT the primary user. The **grandchild/child** records grandma and uploads. The AI Language Bridge works with the younger user as the operator.
- **Mitigation 2:** Community center workshops with facilitators who handle the tech.
- **Mitigation 3:** WhatsApp integration (record voice note → send to Mychelin bot → AI processes).

**Risk: Low willingness to pay**
- **Mitigation:** The "printed cookbook" is the psychological anchor. Families are accustomed to spending $20-50 on physical recipe books. Digital is the gateway; physical product closes the sale.
- **Mitigation 2:** "Heritage urgency" messaging — "Your grandmother's recipes, preserved forever." Emotional value > utility value.
- **Mitigation 3:** Annual gifting cycle (Mother's Day, Lunar New Year, birthdays) → cookbook as gift.

**Risk: AI costs spike**
- **Mitigation:** Multi-provider strategy (Gemini, Whisper, local models). Open-source STT models (Whisper) can handle basic transcription at near-zero cost.
- **Mitigation 2:** Edge/on-device processing for simple tasks.
- **Mitigation 3:** AI costs trend downward historically. Gemini Flash is already 10x cheaper than GPT-4 was at launch.

**Risk: Founder burnout**
- **Mitigation:** Grant funding to hire first team member early.
- **Mitigation 2:** Community-center partnerships create organic growth without constant founder effort.
- **Mitigation 3:** Clear milestone-based roadmap with funding gates.

**Risk: Cultural sensitivity**
- **Mitigation:** Human review layer for published community recipes.
- **Mitigation 2:** Cultural advisory board (NHB contacts, community elders).
- **Mitigation 3:** Clear disclaimers on AI translations; always preserve original audio/text.

**Risk: Privacy/data breach**
- **Mitigation:** Family recipes are private by default. Explicit opt-in for community sharing.
- **Mitigation 2:** Data encrypted at rest (Turso) and in transit.
- **Mitigation 3:** PDPA compliance from day one. Regular security audits.

---

## 8. Five-Year Financial Projection

### 8.1 Key Assumptions

| Assumption | Value | Basis |
|------------|-------|-------|
| Free-to-paid conversion | 25% by Year 3 | Heritage stickiness; comparable to Notion (4-5%) but higher due to emotional value |
| Monthly churn (paid) | 3% | Low; heritage data creates extreme lock-in |
| ARPU (paid, blended) | $9.50/mo SGD | Weighted avg across Cook/Heritage/Community |
| Organic growth rate | 15% MoM (Year 1), declining to 5% MoM | Community-driven + PR-driven early growth |
| SEA expansion adds | 2x Singapore user base by Year 5 | Malaysia + Indonesia by Year 4 |
| AI cost decline | 20% YoY | Historical trend in API pricing |

### 8.2 Base Case Projection (SGD)

| Metric | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|--------|--------|--------|--------|--------|--------|
| **Total Users** | 2,000 | 8,000 | 20,000 | 50,000 | 120,000 |
| **Paid Users** | 400 | 2,000 | 6,000 | 17,500 | 42,000 |
| **MRR (end of year)** | $3,800 | $19,000 | $57,000 | $166,250 | $399,000 |
| **ARR (end of year)** | $45,600 | $228,000 | $684,000 | $1,995,000 | $4,788,000 |
| | | | | | |
| **Subscription Revenue** | $22,800 | $136,800 | $478,800 | $1,397,500 | $3,591,000 |
| **Cookbook Sales** | $2,000 | $15,000 | $60,000 | $175,000 | $400,000 |
| **Workshops/Events** | $1,000 | $8,000 | $25,000 | $50,000 | $80,000 |
| **Institutional/Enterprise** | $0 | $10,000 | $60,000 | $200,000 | $500,000 |
| **Sponsored Campaigns** | $0 | $5,000 | $30,000 | $100,000 | $200,000 |
| **Total Revenue** | **$25,800** | **$174,800** | **$653,800** | **$1,922,500** | **$4,771,000** |
| | | | | | |
| **Infrastructure** | $3,000 | $12,000 | $36,000 | $100,000 | $200,000 |
| **AI API Costs** | $2,400 | $14,400 | $43,200 | $105,000 | $201,600 |
| **Team** | $0 | $60,000 | $168,000 | $372,000 | $600,000 |
| **Marketing** | $3,000 | $24,000 | $60,000 | $180,000 | $360,000 |
| **Legal/Admin** | $1,200 | $6,000 | $18,000 | $36,000 | $48,000 |
| **Total Costs** | **$9,600** | **$116,400** | **$325,200** | **$793,000** | **$1,409,600** |
| | | | | | |
| **Net Profit/Loss** | **$16,200** | **$58,400** | **$328,600** | **$1,129,500** | **$3,361,400** |
| **Net Margin** | 63% | 33% | 50% | 59% | 70% |
| **Cumulative P/L** | $16,200 | $74,600 | $403,200 | $1,532,700 | $4,894,100 |

### 8.3 Scenario Analysis

**Best Case (1.5x growth rates, higher conversion):**

| Metric | Year 3 | Year 5 |
|--------|--------|--------|
| Users | 35,000 | 200,000 |
| ARR | $1.2M | $8.5M |
| Net Profit | $600K | $5.5M |

**Worst Case (0.5x growth, 15% conversion, higher churn):**

| Metric | Year 3 | Year 5 |
|--------|--------|--------|
| Users | 8,000 | 40,000 |
| ARR | $180K | $900K |
| Net Profit | ($30K) | $200K |

> Even in the worst case, Mychelin is near-profitable by Year 3 and profitable by Year 4 due to low fixed costs. The bootstrapped cost structure is forgiving.

### 8.4 Break-Even Analysis

| Scenario | Break-Even Point | When |
|----------|-----------------|------|
| Base case (with grants) | ~800 paid users | Month 10-12 |
| Base case (no grants, no salary) | ~400 paid users | Month 6-8 |
| Base case (with team costs) | ~2,500 paid users | Month 18-22 |
| Worst case | ~3,500 paid users | Month 30-36 |

---

## 9. Strategic Recommendations

### 9.1 Immediate Actions (Next 30 Days)

1. **CMF Grant Application (Due: 31 May 2026)**
   - Identify IPC/charity partner (Chinese clan association, Singapore Heritage Society)
   - Prepare application materials: impact metrics, heritage preservation narrative
   - Target: $30-50K matching grant

2. **First 10 Community Center Pilots**
   - Contact People's Association HQ for partnership framework
   - Design "Record Grandma's Recipes" workshop format (2-hour session)
   - Target: 5 workshops in Q2 2026

3. **PR Push**
   - Pitch to CNA Lifestyle, Mothership, The Straits Times
   - Story angle: "The race to save Singapore's dialect recipes before they're gone forever"
   - Time with CMF application for legitimacy

### 9.2 Year 1 Priorities

1. Achieve 2,000 users / 400 paid subscribers
2. Secure 2+ grants totaling $80K+
3. Complete 20+ community center workshops
4. Build relationship with NHB (attend Heritage Festival, ICH events)
5. Refine AI Language Bridge based on real user dialect data

### 9.3 Year 2 Focus

1. Hire first engineer + community manager
2. Launch mobile app (React Native / Expo)
3. Begin Malaysia pilot (Penang — strong dialect food culture)
4. Institutional sales: first NHB/museum contract
5. Pursue seed round if growth trajectory warrants

---

## 10. Investor One-Pager Summary

**Mychelin** — AI-powered heritage recipe preservation

- **Problem:** 860K elderly Singaporeans hold irreplaceable culinary knowledge in dialects their grandchildren can't understand. Every year, thousands of recipes are lost permanently.
- **Solution:** AI Language Bridge translates dialect speech/text ↔ English. Structured recipe archiving with family stories, cultural context, and multimedia.
- **Market:** 500K SG households (TAM), 40M+ elderly across SEA (expansion TAM)
- **Traction:** MVP live, preparing for CMF Grant (Apr 2026)
- **Moat:** Only platform combining dialect AI + heritage preservation. Data moat deepens daily as irreplaceable recordings are captured.
- **Model:** Freemium SaaS + printed cookbooks + institutional licensing
- **Unit Economics:** 97% gross margin at scale, LTV:CAC > 17:1, $0.16/user/month cost
- **Ask:** $50-150K (grants) now → $500K-1M seed at 5K paid users
- **Vision:** The world's largest structured database of heritage recipes, starting with Southeast Asia's most urgent preservation need.

---

*This document should be treated as a living model. Update assumptions quarterly as real user data becomes available. The projections are based on research and reasonable estimates — actual performance will vary.*
