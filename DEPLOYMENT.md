# Mychelin Deployment Map

Production is intentionally a two-level repo:

- **Repo / deploy wrapper:** `/home/cluser/projects/mychelin`
- **Production app code:** `/home/cluser/projects/mychelin/app`
- **Live URL:** `https://mychelin-sg.vercel.app`
- **Correct Vercel project:** `mychelin` (`prj_keoeCPZKShPgjPWLR5gpWxWIlfCt`)
- **Vercel Root Directory:** `app`

## Commands

Build the production app locally:

```bash
cd /home/cluser/projects/mychelin/app
npm run build
```

Deploy production:

```bash
cd /home/cluser/projects/mychelin
vercel --prod
```

Do **not** deploy from inside `app/`. The root `.vercel/` link points at the correct production project.

## Archive

The old root-level prototype `src/` is archived at:

```text
archive/root-prototype-src-2026-05-22/
```
