# Mychelin App

This directory contains the production Next.js app for Mychelin. The repository root is a deploy wrapper; Vercel is configured with `app/` as the root directory.

For the public project overview, see [`../README.md`](../README.md).

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment

Use `.env.local` for local secrets. Do not commit real credentials.

Common variables:

```text
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
JWT_SECRET=
BLOB_READ_WRITE_TOKEN=
GOOGLE_API_KEY=
```

`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are enough for the minimal checked-in `.env.example`; other integrations are needed for full auth, uploads, and AI capture flows.

## Scripts

```bash
npm run dev          # local dev server
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
npm run db:generate  # Drizzle migration generation
npm run db:migrate   # apply migrations
npm run db:push      # push schema changes
npm run db:studio    # inspect local/remote DB via Drizzle Studio
```

## Notes for contributors

- Keep product behavior changes in `app/`; root-level files are mostly project/deploy documentation.
- Do not commit `.env`, `.env.local`, database dumps, real family recipes, voice files, or screenshots containing private data.
- Prefer small, reviewable PRs with clear testing notes.
- New API routes should follow the existing runtime/client patterns in the codebase.
