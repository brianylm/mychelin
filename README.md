# Mychelin

Production is intentionally a two-level repo:

- `~/projects/mychelin/` — repo root / deploy wrapper
- `~/projects/mychelin/app/` — real production Next.js app
- `~/projects/mychelin/archive/` — retired prototypes and local Vercel links

## Quick reference

Edit app code:

```bash
cd ~/projects/mychelin/app
```

Build app:

```bash
cd ~/projects/mychelin/app
npm run build
```

Deploy production:

```bash
cd ~/projects/mychelin
vercel --prod
```

Live site: https://mychelin-sg.vercel.app

Vercel project: `mychelin` (`prj_keoeCPZKShPgjPWLR5gpWxWIlfCt`)

Vercel Root Directory: `app`

Do **not** deploy from inside `app/`; the root `.vercel/` link points to the correct production project.
