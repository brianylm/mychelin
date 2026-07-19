# Mychelin UI Uplift Baseline

_Captured: 2026-07-19_

This is the comparison point for the staged Mychelin UI uplift. It records the restored production experience before new visual work. Measurements are directional lab results, not field percentiles; repeat the same commands and conditions when comparing a phase.

## Approved Direction

- Preserve the existing DM Sans, Newsreader, and Libre Baskerville roles.
- Preserve rounded branded navigation and dark active-tab pills.
- Preserve the warm paper, white surface, burgundy accent, and restrained shadow language.
- Keep cards for real objects and dialogs; use spacing and dividers for sections.
- Make desktop layouts use their width without adding a permanent sidebar outside Library.
- Preserve the landing hero composition and use minimal, fast motion.

The full lock is recorded in the root `DESIGN.md`.

## Staging Gate

- Branch: `ui-uplift`
- Stable preview: `https://mychelin-ui-uplift.vercel.app`
- Initial deployment: `dpl_HckhkTdL5BBdxLfEre5WXsEWHZbd`
- Current Phase 1 deployment: `dpl_22MoWzajmg2zWNRdbJ16fAq6J1yK`
- Preview uses a separate branch-scoped `JWT_SECRET`; production credentials were not copied.
- Password signup, auth-cookie creation, and `/api/auth/me` returned 201/200/200 on both the deployment URL and stable alias.
- Synthetic staging accounts were deleted and verified at zero remaining.
- Google login is not a staging gate yet because Google credentials and an allowlisted staging callback are not configured for Preview. Use password login for uplift testing.

## Public Landing Baseline

Lighthouse 12.6.0 ran against `https://mychelin-sg.vercel.app` with cached Playwright Chromium.

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 59 | 94 |
| Accessibility | 89 | 85 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |
| First Contentful Paint | 1.6s | 0.4s |
| Largest Contentful Paint | 9.6s | 1.6s |
| Total Blocking Time | 610ms | 0ms |
| Time to Interactive | 10.5s | 1.7s |
| Cumulative Layout Shift | 0 | 0 |
| Total transfer | 2,825 KiB | 2,823 KiB |

Primary finding: the raw landing hero image is the mobile LCP element. Lighthouse estimates about 1,811 KiB can be saved by responsive image delivery. The current page also fails checks for low-contrast footer/carousel text, disabled zoom through `maximum-scale=1`, and partially obscured carousel arrow targets on desktop.

Responsive screenshots were captured at 320x568, 375x812, 414x896, 768x1024, and 1440x900. Every phase must compare those same widths and preserve the approved composition.

## JavaScript Baseline

The local production build emitted 35 JavaScript chunks:

- Total raw chunk size: 1,375,722 bytes.
- Total gzip size: 399,999 bytes.
- Largest chunks: 289,307 raw / 68,730 gzip and 224,412 raw / 70,097 gzip.

This total includes lazy chunks, so it is not an initial-route transfer figure. Phase comparisons must report both route-loaded resources and aggregate build output rather than treating the aggregate as initial load.

## Authenticated API Baseline

Four read-only samples per endpoint were run against production with a short-lived signed session. Only status, payload size, and timing were recorded; no recipe or user content was printed.

| Endpoint | Warm median | Slowest sample |
| --- | ---: | ---: |
| `/api/auth/me` | 297ms | 4,693ms |
| `/api/recipes` | 314ms | 324ms |
| `/api/recipes/:id` | 362ms | 5,608ms |
| `/api/books` | 306ms | 5,223ms |
| `/api/activity` | 339ms | 570ms |
| `/api/meal-plans` | 291ms | 5,486ms |
| `/api/shopping-list` | 468ms | 705ms |
| `/api/inventory` | 292ms | 4,810ms |
| `/api/user/preferences` | 296ms | 3,803ms |

The warm path is generally acceptable, but several independent Edge routes show multi-second cold samples. Do not eagerly fetch data for hidden views. Recipe lists stay lightweight; recipe details, Books, attempts, planning, and inventory load only when their owning surface needs them.

## Phase Gates

Every phase must:

1. Change one user-visible surface or connected workflow only.
2. Preserve a dedicated rollback commit.
3. Pass focused ESLint, TypeScript, production build, and `git diff --check`.
4. Compare the five responsive widths with no overflow, clipping, or incoherent overlap.
5. Report request count, slowest request, transferred bytes, and Lighthouse change where relevant.
6. Verify keyboard, touch, focus, loading, empty, error, and success states for changed controls.
7. Deploy to the stable staging alias for acceptance before production.
8. Run privacy or pilot smoke coverage when the changed surface touches user-scoped data or the core loop.

## First Implementation Slice

Phase 1 is deliberately non-structural:

- Preserve the landing layout and image crop while delivering the hero responsively through `next/image`.
- Restore browser zoom by removing `maximum-scale=1`.
- Correct the measured footer/carousel contrast failures.
- Make carousel arrow targets at least 44px without changing their pill/circle appearance.
- Re-run the same mobile and desktop Lighthouse audits and screenshot widths.

Acceptance target: materially reduce the 9.6s mobile LCP with no visible composition regression and no production deployment before staging approval.

## Phase 1 Results

Phase 1 changed only landing-page delivery and measured accessibility defects. It replaced the raw hero image with responsive `next/image` delivery while preserving its crop and layout, restored browser zoom, increased carousel control targets, removed inactive carousel content from the accessibility tree, and corrected measured contrast failures.

| Metric | Baseline mobile | Phase 1 mobile | Baseline desktop | Phase 1 desktop |
| --- | ---: | ---: | ---: | ---: |
| Performance | 59 | 74 | 94 | 99 |
| Accessibility | 89 | 100 | 85 | 100 |
| Best practices | 100 | 100 | 100 | 100 |
| SEO | 100 | 100 | 100 | 100 |
| First Contentful Paint | 1.6s | 1.6s | 0.4s | 0.4s |
| Largest Contentful Paint | 9.6s | 4.0s | 1.6s | 0.8s |
| Total Blocking Time | 610ms | 480ms | 0ms | 40ms |
| Time to Interactive | 10.5s | 4.0s | 1.7s | 0.8s |
| Cumulative Layout Shift | 0 | 0 | 0 | 0 |
| Total transfer | 2,825 KiB | 462 KiB | 2,823 KiB | 518 KiB |

The same five screenshot widths remained compositionally stable. Mean absolute pixel deltas ranged from 1.16 to 2.97, mainly from responsive JPEG encoding; pixels differing by more than 32 levels stayed at or below 0.15%.

Validation passed: focused ESLint, `npx tsc --noEmit`, production build, `git diff --check`, responsive screenshot comparison, and a deployed password-login/session smoke. Synthetic accounts were removed and verified at zero. Google login remains outside this staging gate. Production remains pinned to the known-good July 10 deployment.

Remaining measured landing cost is mostly the global Radix stylesheet and main-thread JavaScript. Those are intentionally deferred because changing shared runtime styling or loading behavior would exceed this slice and could destabilize authenticated workflows.
