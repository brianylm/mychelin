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
- **AI:** Google Gemini-compatible API key for recipe extraction/transcription workflows
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
GOOGLE_API_KEY=
```

The app also supports Gemini-compatible aliases where implemented. See [`app/.env.example`](./app/.env.example) for the minimal checked-in template.

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

Because Mychelin handles family stories, photos, voices, and recipes, please treat test data and screenshots as potentially sensitive. Do not include real family data in issues, PRs, fixtures, or demos without consent.

## License

MIT — see [`LICENSE`](./LICENSE).
