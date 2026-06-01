# Contributing to Mychelin

Thanks for helping preserve Singapore family food heritage. Mychelin is early, so the best contributions are small, focused, and easy to review.

## Development setup

```bash
git clone https://github.com/brianylm/mychelin.git
cd mychelin/app
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

For full local functionality, add local values for the environment variables documented in [`README.md`](./README.md). Never commit secrets.

## Before opening a PR

From `app/`:

```bash
npm run lint
npm run build
```

If your change only touches documentation, `git diff --check` is enough.

## Issue and PR guidance

- Check existing issues before filing duplicates.
- Keep PRs focused on one problem or feature.
- Include a short summary, screenshots for UI changes, and testing notes.
- For schema changes, include the relevant Drizzle migration and explain the data impact.
- Avoid drive-by refactors unless they directly support the change.

## Code style

- TypeScript-first, matching existing project patterns.
- Prefer simple components and clear data flow over premature abstraction.
- Preserve mobile-first and PWA behavior.
- Be especially careful around auth, recipe sharing, and upload/voice flows.

## Privacy and security

Mychelin may handle private family recipes, photos, stories, and voice recordings. Do not use real personal or family data in tests, screenshots, fixtures, seed files, or public issues unless everyone involved has explicitly consented.

If you find a security or privacy issue, please follow [`SECURITY.md`](./SECURITY.md) instead of opening a public issue.
