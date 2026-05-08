# Mychelin — Deployment & Codebase Memory

## The Confusion (Resolved)

There are **two Vercel projects** and **one codebase**. This has caused repeated deployment confusion.

| Vercel Project | Project ID | Deploys To | Root Directory (Vercel Dashboard) |
|---|---|---|---|
| `mychelin` | `prj_keoeCPZKShPgjPWLR5gpWxWIlfCt` | **`mychelin-sg.vercel.app`** ✅ | `mychelin-1` |
| `mychelin-1` | `prj_IBU2ghU2Kr2D5pGDluKsLow5tSp2` | `mychelin-1.vercel.app` | (root of its own project) |

## The Correct Way to Deploy

**Always deploy from the ROOT directory**, NOT from `mychelin-1/`:

```bash
cd /home/cluser/projects/mychelin
vercel --prod        # production
vercel               # preview
```

The `mychelin` Vercel project is configured in the Vercel dashboard to build from the `mychelin-1/` subdirectory. So even though you deploy from root, it compiles the code inside `mychelin-1/`.

**Do NOT deploy from `mychelin-1/` directly** — that pushes to the wrong Vercel project (`mychelin-1.vercel.app`), which is NOT the live production site.

## Where the Code Lives

All application code lives in **`/projects/mychelin/mychelin-1/src/`**.

The root `/projects/mychelin/` has its own `package.json` and `src/`, but those are **NOT used in production**. The root project is just a shell that Vercel uses to reach the `mychelin-1/` subdirectory.

## Quick Reference

| What you want | Command |
|---|---|
| Production deploy | `cd /home/cluser/projects/mychelin && vercel --prod` |
| Preview deploy | `cd /home/cluser/projects/mychelin && vercel` |
| Live site | `https://mychelin-sg.vercel.app` |
| Wrong site (don't use) | `https://mychelin-1.vercel.app` |

## Verification

Check you're deploying to the right project:
```bash
cd /home/cluser/projects/mychelin
cat .vercel/project.json
# Should show: "projectName":"mychelin"
# NOT: "projectName":"mychelin-1"
```
