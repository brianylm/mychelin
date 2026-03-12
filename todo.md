# Brainie's Backlog

## Projects

### Brainie's Command Center
- [x] Create GitHub Repo `brianylmorg/brainies-command-center`
- [x] Initial Local Build (Next.js 16)
- [x] Setup Turso DB `brainies-command-center`
- [x] Add Model Switcher Logic (`app/page.tsx`)
- [x] Add Spend/Speed Limit Visualization (Claude/Gemini)
- [ ] **DEBUG: Vercel Deployment Stalled**
- [ ] Implement Real OpenClaw API Connection
- [ ] Add "Switch to Sonnet" functionality

### Morning Briefing
- [x] **Refine Persona:** Concise, Ticker-based, actionable.
- [x] **Setup Price Alerts:** VIRTUAL @ $0.675 (via `HEARTBEAT.md`)
- [x] **Setup Cron Job:** 01:00 UTC (09:00 SGT).
- [ ] **Data Sources:** Use average with fallback for VIRTUAL. Include BTC, Gold, Macro Stocks.

### Mychelin (Heritage Food App)
- [ ] **PRD:** `~/projects/mychelin/docs/PRD-COMBINED.md`
- [ ] **Status:** Concept/PRD phase.

## Operations (Priority Queue)
1.  **Termius Setup (MacBook):**
    - **Goal:** Sync SSH keys/configs from main workstation to MacBook for seamless remote access.
    - **Action:** Guide B through Termius installation & key import when back at desk.
2.  **URGENT: Restore Nano Banana Image Generation**
    - **Issue:** `gemini-3.1-flash-image-preview` failing via standard curl.
    - **Goal:** Enable direct image generation by tonight.
3.  **DEBUG: Vercel Deployment Stalled**
    - **Symptoms:** Live site shows old version ("Brave Search") despite git pushes.
    - **Action:** Walk through Vercel Dashboard with B. Check deployments list.
- [x] Watchdog Script (`~/.openclaw/scripts/watchdog.py`)
- [x] Identity Restoration (Brainie + B)

## Learning & Guidelines
- **Market Analysis Persona:**
  - **Model:** **MUST USE** `anthropic/claude-3-5-sonnet` or `opus` for analysis (no Gemini Flash).
  - **Framework (The "Analyst's Eye"):**
    1.  **Structure:** Is it Chopping or Trending? (Default: Chop).
    2.  **Traps:** Look for High OI + Resistance Rejection (Bear Trap) or Support Bounce (Bull Trap).
    3.  **Discipline:** "Stay out unless huge catalyst." No forcing trades.
  - **Tone:** Professional, precise, level-headed. **CONCISE.**
  - **Structure:** Always break by **TICKER** + **Price** + **Change**.
  - **Mandatory:** Include **Actionable Recommendation** (Accumulate / Hold / Cut / Wait).
  - **Synthesis:** For alts (VIRTUAL), **synthesize BTC context** into the recommendation directly.
  - **Position Awareness:** User HAS a position in VIRTUAL.
  - **Alerts:** Be proactive on key levels ($0.66 support).
- **Code:** No mistakes. Check imports. Verify build locally before pushing.
