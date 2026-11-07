# Mychelin

Mychelin is a Singapore-first PWA for preserving family food heritage: oral recipes, dialect instructions, kitchen stories, voices, structured recipes, meal plans, and shopping lists in one place.

The live app is available at **https://mychelin-sg.vercel.app**.

## Why this exists

Many of Singapore's most important recipes are still passed down by voice: in Hokkien, Teochew, Cantonese, Malay, Tamil, English, or a mix of all of them; with instructions like "agak-agak", "until fragrant", and "listen to the wok". Mychelin helps families turn those conversations into durable digital heirlooms without losing the story around the dish.

The project is open source so the preservation workflow can be inspected, improved, and adapted by families, heritage groups, schools, and community partners. The hosted service may develop sustainable paid/premium options later, but the current mission is public-good heritage preservation.

## Features

- **Conversation-first recipe capture** — capture recipes through guided prompts instead of forcing a rigid form up front.
- **Dialect and multilingual heritage fields** — preserve names, notes, stories, and instructions across family languages.
- **Voice and story preservation** — record the cook's voice and keep context with the recipe.
- **Structured recipe workspace** — ingredients, steps, servings, timings, photos, ratings, and version history.
- **Family recipe books** — organise recipes into books and invite family members.
- **Meal planning and shopping lists** — turn preserved recipes into practical weekly cooking.
- **PWA support** — installable web app with service-worker support for a mobile-first cooking flow.

## Tech stack

The production app lives in [`app/`](./app). The repository root is a deploy wrapper for Vercel.

- **Framework:** Next.js 16, React 19, TypeScript
- **UI:** Tailwind CSS, Radix UI, lucide-react
- **Data:** Turso/libSQL, Drizzle ORM
- **Auth:** JWT cookie auth with bcrypt password hashing
- **Storage:** Vercel Blob for uploaded assets
- **AI:** OpenAI for speech-to-text; DeepSeek V4 Flash for low-cost text reasoning and recipe extraction; optional Gemini fallback for audio/text workflows
- **Hosting:** Vercel, with root directory set to `app`

## Repository layout

```text
.
├── app/                 # Production Next.js application
├── DEPLOYMENT.md        # Deployment map and production smoke-test notes
├── grants/              # Grant and partnership working documents
├── README.md            # Public project overview
├── ROADMAP.md           # OSS-facing roadmap
├── CONTRIBUTING.md      # Contribution guide
└── SECURITY.md          # Security and privacy reporting
```

## Local development

```bash
git clone https://github.com/brianylm/mychelin.git
cd mychelin/app
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

### Environment variables

Use `.env.local` for local development. Do not commit secrets.

Required for a full local app:

```text
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
JWT_SECRET=
BLOB_READ_WRITE_TOKEN=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

Gemini-compatible aliases remain optional where implemented. See [`app/.env.example`](./app/.env.example) for the minimal checked-in template.

## Common commands

Run these from `app/` unless noted otherwise:

```bash
npm run dev       # start local dev server
npm run lint      # run ESLint
npm run build     # production build
npm run db:generate
npm run db:migrate
npm run db:studio
```

Deployment is run from the repository root because the root `.vercel/` link points at the production project:

```bash
cd /path/to/mychelin
vercel --prod
```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for operational details.

## Roadmap

The current roadmap focuses on trustworthy heritage capture rather than generic recipe-app breadth:

1. AI-assisted oral recipe capture and clarification
2. Dialect/multilingual transcription and translation review flows
3. Voice recording privacy controls and consent UX
4. Family sharing permissions and recipe-book collaboration
5. Mobile PWA polish for seniors and kitchen use
6. Import from handwritten recipe cards and photos
7. Test coverage around auth, sharing, and privacy boundaries

See [`ROADMAP.md`](./ROADMAP.md) for more detail.

## Contributing

Contributions are welcome, especially around accessibility, privacy, localisation, PWA reliability, and tests. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md).

From the repository root, run `bash scripts/verify.sh fast` for typecheck,
changed-file lint, unit tests, and the feature-map guard when available. Run
`bash scripts/verify.sh ui` to also exercise mobile Playwright, privacy and pilot
smokes against a fresh local libSQL database. UI verification needs the authenticated
`turso` CLI and the cached Playwright browser; it never installs dependencies or
browsers. Ports 3100 and 8317 must be free.

The runner overrides database credentials, hides dotenv files from Node, and blocks
outbound Node connections. Its sole remote operation dumps staging DDL; if that
fails, a previously cached schema can be used. Next's font test hook uses system
fallbacks offline. UI verification builds first, then starts a production server
and the temporary database with one Playwright worker. The local servers and
temporary database are removed on exit; `app/.next` is removed only if it did not
exist before the run.
Evidence lives in `.verify/last.json`, `.verify/logs/`, `.verify/playwright/`, and
seven mobile screenshots in `.verify/shots/`.
Playwright's JSON results are in `.verify/playwright/results.json`; tests that
pass on retry appear in the summary and the `flaky` array in `.verify/last.json`.
Typecheck/lint diagnostics are
excused only when an untouched archive of `LINT_BASE` reproduces them (default:
the merge-base with `origin/main`); logs label these `PRE-EXISTING`.

Known failures must be reproduced on a clean `origin/release-2026-11-06` archive
before classification. All mobile specs currently run. The local server's
privacy/pilot signup failures are an artifact of Next's LOCAL Edge emulation:
`EDGE_UNSUPPORTED_NODE_APIS` in next/dist/shared/lib/constants.js includes
`setImmediate`, for which the sandbox defines a throwing stub. bcryptjs's
`typeof setImmediate === "function"` check selects it and throws (reproduced
2026-11-07 on release SHA `33969a43175fe7de856fc3838c96449244ec6480`).
On Vercel's real Edge runtime `setImmediate` is undefined and bcryptjs falls back
to scheduler/setTimeout, so production signup is not implicated by this artifact
(not yet confirmed against prod). The runner still attempts both smokes: only
that exact assertion plus a new matching server error is classified as
`known-failing`, with evidence in `last.json`; other failures fail verification.
The remaining local smoke assertions are blocked by this emulation artifact.

Because Mychelin handles family stories, photos, voices, and recipes, please treat test data and screenshots as potentially sensitive. Do not include real family data in issues, PRs, fixtures, or demos without consent.

## License

MIT — see [`LICENSE`](./LICENSE).
