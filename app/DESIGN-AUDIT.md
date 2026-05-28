# Mychelin User Flow Audit — May 2026

## Executive Summary

Mychelin has solid core functionality but several friction points that block user activation, retention, and sharing. The biggest gaps are in **onboarding clarity**, **recipe creation guidance**, **empty-state handling**, and **social sharing virality**. Most issues are medium-effort, high-impact UX fixes.

---

## 1. Landing Page → Signup Flow

### Current Flow
Landing page → "Get started" → `/login?mode=signup` → AuthScreen → Enter name/email/password → Submit → Redirect `/app`

### Issues Found

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1.1 | **No social proof on landing** — No user count, testimonials, or "trusted by X families" social proof | Conversion | Low |
| 1.2 | **Hero CTA is weak** — "Preserve your family's food heritage" is abstract. No clear value proposition of *what* the user gets (save recipes? share? discover?) | Conversion | Low |
| 1.3 | **No preview/demo mode** — User must create account before seeing the app. No "try without signing up" path | Conversion | Medium |
| 1.4 | **AuthScreen error handling is silent** — `login()` and `signup()` return strings on error, but the form just shows a red line. No inline field-level validation (e.g. "email already exists", "password too short") | Activation | Low |
| 1.5 | **No password strength indicator** — Users can enter weak passwords with no feedback | Activation | Low |
| 1.6 | **No email verification** — Users can signup with any email, no verification step. Risk of fake accounts and email bounces | Retention | Medium |
| 1.7 | **Signup → app redirect is jarring** — After signup, user lands in an empty RecipeWorkspace with no recipes, no tutorial, no "what now?" guidance | Activation | **High** |
| 1.8 | **ReturnTo param handling is fragile** — `window.location.href = returnTo` does a full page reload instead of client-side navigation. Breaks app state | UX | Low |

### Recommendations

1. **Add a "Take a tour" or "See example cookbook" button** on landing that opens a demo book without requiring signup
2. **Replace abstract hero copy with concrete value**: "Capture family recipes from voice conversations. Build a shareable cookbook. Preserve heritage for generations."
3. **Add inline field validation to AuthScreen** — validate email format, password length (≥8), name presence before submit
4. **Post-signup onboarding modal** — First-time users see: "Welcome! Here's how to capture your first recipe" with 3-step guided walkthrough
5. **Seed demo recipes** for new users — Create 2-3 sample recipes (e.g. "Ah Ma's Laksa", "Popiah") so the app isn't empty on first login

---

## 2. Recipe Creation & Capture Flows

### Current Flows
- **From scratch**: FAB → "From scratch" → Blank recipe created → Title auto-focused → User fills fields
- **Quick capture**: FAB → "Quick capture" → Blank draft → PasteRecipeModal opens → Paste text/URL → AI extracts → Saves to recipe
- **Conversation capture**: Recipe page → "Record conversation" → ConversationCapture modal → Record audio → Stream to Gemini → Extract recipe → Assign speaker names → Save

### Issues Found

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 2.1 | **Quick capture failure is silent** — If AI extraction fails or API key missing, user sees "Error processing" with no retry or manual fallback path | Activation | Medium |
| 2.2 | **ConversationCapture requires Gemini API key** — Most users won't have this configured. The setup error banner is good but the feature is essentially dead for 95% of users | Activation | High |
| 2.3 | **No "save as draft" vs "publish" distinction** — Recipe status exists in schema but UI doesn't expose it. All recipes are immediately "active" | Content quality | Low |
| 2.4 | **Ingredient input is tedious** — No bulk paste for ingredients. User must add one at a time via form | Activation | Medium |
| 2.5 | **No template recipes** — No "Laksa template" or "Chicken rice template" to start from. Every recipe is blank slate | Activation | Medium |
| 2.6 | **Photo upload has no guidance** — No "Add a photo of the finished dish" placeholder or camera prompt | Content quality | Low |
| 2.7 | **No autosave indicator** — Users don't know if their edits are saved. SaveIndicator component exists but isn't prominently used | Trust | Low |
| 2.8 | **RecipeView is overwhelming for new users** — 15+ sections (title, details, ingredients, steps, story, photos, voice, versions, books, share, fork) all visible at once. No progressive disclosure | Activation | Medium |
| 2.9 | **No "Import from URL" standalone flow** — PasteRecipeModal only opens after creating a blank recipe. No direct "Import from URL" that creates + populates in one step | Activation | Low |
| 2.10 | **No undo after AI extraction** — If AI gets ingredients wrong, user must manually delete and re-add. No "regenerate" or "edit extraction" mode | Content quality | Medium |

### Recommendations

1. **Add "Import from URL" as standalone FAB option** — Creates recipe + fetches + extracts in one action
2. **Bulk ingredient paste** — Textarea where user pastes "2 cups flour\n1 tsp salt" and it parses into structured ingredients
3. **Progressive disclosure in RecipeView** — Show only core sections (title, ingredients, steps) by default. Advanced sections (story, voice, versions, cultural context) behind "Add more details" expander
4. **Template gallery** — "Start from template: Laksa / Hainanese Chicken Rice / Popiah" — pre-fills common ingredients and structure
5. **Fallback for AI extraction failures** — If Gemini fails, show manual form pre-filled with raw text so user can fix it
6. **Add autosave toast** — "Recipe saved" briefly shown after 2s of inactivity

---

## 3. Recipe Discovery & Browsing

### Current Flow
RecipeSidebar lists all recipes → Click to view → RecipeView shows full details

### Issues Found

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 3.1 | **No empty state for new users** — Sidebar is blank, RecipeView shows "Select a recipe" placeholder. No "Create your first recipe" CTA | Activation | Low |
| 3.2 | **Sidebar search only matches titles** — Can't search by ingredient (e.g. "chicken" doesn't find "Hainanese Chicken Rice" if user searches "chicken") | Retention | Medium |
| 3.3 | **No recipe categorization** — No tags, no cuisine filter in sidebar. Schema has cuisine field but sidebar doesn't filter by it | Discovery | Low |
| 3.4 | **Discover view is buried** — "Surprise me" is under "Plan" tab, not prominent. Most users won't find it | Engagement | Low |
| 3.5 | **No "Recently cooked" or "Favorites"** — No way to mark recipes as favorites or see cooking history | Retention | Medium |
| 3.6 | **No related recipes** — When viewing Laksa, no "You might also like: Mee Siam, Mee Rebus" suggestions | Engagement | Medium |
| 3.7 | **Recipe list has no sorting** — Only alphabetical? No "recently added", "recently cooked", "by cuisine" | Discovery | Low |
| 3.8 | **Shared page is read-only with no interactivity** — `/shared/[token]` shows recipe but no "I cooked this" or "Add to my collection" for logged-in users beyond the Save button | Engagement | Low |

### Recommendations

1. **Rich empty state** — "No recipes yet. Capture your first recipe from a conversation, import from a URL, or start from scratch" with 3 big buttons
2. **Add sidebar filters** — Filter by cuisine, occasion, book. Sort by recent, alphabetical, recently cooked
3. **Move "Discover" to dedicated tab or surface it** — "Surprise me" should be a prominent action, not hidden
4. **Add "Favorite" toggle** — Star recipes, show "Favorites" filter in sidebar
5. **Add "I cooked this" button** — Records cooking date, shows "Last cooked 3 days ago" badge
6. **Related recipes** — Simple matching: same cuisine + shared ingredients → suggest related

---

## 4. Sharing & Virality Flow

### Current Flow
RecipeView → Share button → ShareModal → Create link (view/edit) → Copy to clipboard → Send to recipient → Recipient opens `/shared/[token]` → Sees recipe → SignupNudge appears after 2s

### Issues Found

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 4.1 | **Share modal has no preview** — User can't see what the shared page will look like before generating link | Trust | Low |
| 4.2 | **Shared page has no native share** — No Web Share API for mobile (share to WhatsApp, Telegram directly) | Virality | Low |
| 4.3 | **SignupNudge is aggressive** — Auto-expands modal after 2s. Users may close immediately without reading. No "maybe later" option | Conversion | Low |
| 4.4 | **No "Share to social" with image** — No OG image generation for shared recipes. Social shares will show generic preview | Virality | Medium |
| 4.5 | **No collaborative editing** — Share link with "edit" permission but no real-time collaboration indicators | Collaboration | High |
| 4.6 | **No "Invite family member" flow** — No dedicated "Add family member" that sends email invite | Virality | Medium |
| 4.7 | **Save button on shared page has no loading state** — "Save to Mychelin" → click → no feedback until success banner | Trust | Low |
| 4.8 | **No QR code for sharing** — Older family members might prefer scanning a QR code at a gathering | Accessibility | Low |

### Recommendations

1. **Add Web Share API** — On mobile shared pages, show native share sheet
2. **Generate OG images for shared recipes** — Dynamic image with recipe title, photo, "Shared on Mychelin" branding
3. **QR code generation** — In ShareModal, show QR code for easy mobile sharing at family gatherings
4. **Nudge family invite flow** — "Share with family" → enter 3 email addresses → sends personalized invite with context
5. **Make SignupNudge less aggressive** — Start with thin banner only, expand on click. Don't auto-expand

---

## 5. Books & Collaboration Flow

### Current Flow
BooksView → Create book → Add recipes → Share book → Members can view/edit

### Issues Found

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 5.1 | **Books are not discoverable from main UI** — No "Books" tab in bottom nav. User must find it via recipe "Add to book" action | Discovery | Low |
| 5.2 | **No book cover customization** — Schema has coverEmoji and coverColor but UI for choosing them is basic (if present) | Delight | Low |
| 5.3 | **No book-level sharing settings** — Can't set "family only" vs "public" per book | Privacy | Medium |
| 5.4 | **No member management UI** — No view of who has access, no remove member, no permission levels displayed | Collaboration | Medium |
| 5.5 | **Cooking principles are buried** — Schema and components exist but not prominently featured in book view | Differentiation | Low |

### Recommendations

1. **Add "Books" to bottom nav** — Replace "Discover" or make it 5th tab
2. **Book cover gallery** — Let users pick from preset heritage-themed covers or upload custom
3. **Member management panel** — Show avatars, roles, last active. Allow owner to remove/revoke

---

## 6. Meal Planning & Shopping

### Current Flow
Plan tab → Calendar view → Click date → Add meal → Pick recipe → Set servings → Save → Export to calendar

### Issues Found

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 6.1 | **No recipe suggestions for meal planning** — Empty meal slot shows "+" but no "Suggested: Chicken Rice (you cooked this 3 days ago)" | Engagement | Medium |
| 6.2 | **No shopping list auto-generation from meal plan** — User must manually add ingredients to shopping list | Activation | Medium |
| 6.3 | **Shopping list is isolated from inventory** — Adding "2 onions" to shopping list doesn't check if you already have 3 onions in fridge | Efficiency | Medium |
| 6.4 | **Calendar export is hidden** — CalendarExport component exists but not prominently surfaced in meal plan | Retention | Low |
| 6.5 | **No "Cook this" from meal plan** — Clicking a planned meal should open recipe with pre-scaled servings | UX | Low |

### Recommendations

1. **Auto-generate shopping list from meal plan** — "Plan 5 meals → Generate shopping list" with ingredient aggregation
2. **Check inventory before adding to shopping list** — "You already have 3 onions (expires in 2 days) — skip?"
3. **"Cook now" from meal plan** — Opens recipe with servings pre-scaled to planned amount

---

## 7. Fridge / Inventory Flow

### Current Flow
Fridge tab → Add item (name, qty, unit, location, expiry) → Save → View list with expiry warnings

### Issues Found

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 7.1 | **Adding items is tedious** — No barcode scan, no "Add from recipe ingredients" | Activation | High |
| 7.2 | **No recipe suggestions based on inventory** — "You have chicken, coconut milk, and laksa leaves — make Ah Ma's Laksa?" | Engagement | Medium |
| 7.3 | **Expiry warnings are subtle** — Red text only, no push notification or email reminder before expiry | Retention | Medium |
| 7.4 | **No consumption tracking** — Adding "2 onions used" doesn't decrement inventory | Accuracy | Medium |

### Recommendations

1. **"Use ingredients from recipe"** — After viewing a recipe, one-tap "Use these ingredients" that deducts from inventory
2. **Recipe suggestions from inventory** — Match available ingredients to recipe ingredient lists
3. **Push notification for expiring items** — "Your laksa leaves expire tomorrow — cook something?"

---

## 8. Profile & Settings

### Issues Found

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 8.1 | **No account deletion** — GDPR/privacy requirement missing | Compliance | Medium |
| 8.2 | **No data export** — Users can't download their recipes | Trust | Medium |
| 8.3 | **Preferences don't affect app behavior** — Favorite cuisines and dietary restrictions are saved but not used for filtering or recommendations | Personalization | Medium |
| 8.4 | **No dark mode toggle** — Only system preference, no manual override | Accessibility | Low |
| 8.5 | **No notification preferences** — Can't opt in/out of email reminders, expiry alerts | Retention | Low |

### Recommendations

1. **Use preferences for discovery** — "Based on your love of Peranakan food, try..."
2. **Add "Export my recipes"** — JSON/CSV download of all recipes
3. **Add "Delete my account"** with confirmation and data deletion

---

## 9. Mobile-Specific Issues

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 9.1 | **Bottom nav covers FAB** — On some screen sizes, FAB and bottom nav overlap | UX | Low |
| 9.2 | **Sidebar is drawer-only on mobile** — No always-visible recipe list on tablets | UX | Low |
| 9.3 | **No pull-to-refresh** — Must rely on auto-refresh or re-open app | UX | Low |
| 9.4 | **RecipeView horizontal scroll on small screens** — Some sections may overflow | UX | Low |
| 9.5 | **No offline indicator** — PWA exists but no "You're offline" banner when connection drops | Reliability | Low |

---

## Priority Matrix

### Quick Wins (Do This Week)
1. Post-signup onboarding modal with demo recipes
2. Rich empty state in sidebar
3. Inline auth validation (email format, password length)
4. Make SignupNudge less aggressive (no auto-expand)
5. Add "Favorite" toggle to recipes
6. Add Web Share API to shared pages
7. Add "Books" to bottom nav

### Medium Term (Do This Month)
1. Bulk ingredient paste
2. Template recipe gallery
3. Auto-generate shopping list from meal plan
4. Recipe suggestions from inventory
5. OG images for shared recipes
6. Sidebar filters (cuisine, occasion, sort)
7. Progressive disclosure in RecipeView

### Long Term (Do Next Quarter)
1. ConversationCapture without requiring API key (use shared/backend key)
2. Real-time collaborative editing
3. Barcode scanning for inventory
4. Push notifications for expiry alerts
5. AI-powered "recipe from pantry" suggestions
6. Full data export / account deletion

---

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Signup → first recipe created | ? | >60% within 24h |
| Recipe creation abandonment | ? | <30% |
| Share link creation per user | ? | >2 per active user |
| Weekly active users (return rate) | ? | >40% |
| Meal plan usage | ? | >30% of active users |

*Recommend adding analytics instrumentation to measure these before making changes.*
