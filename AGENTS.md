# AGENTS.md — Mychelin

Thin operating card. Canonical project context lives in the Second Brain vault; keep this file short.

## Read order

1. This file.
2. Vault project state: `/home/cluser/second-brain-vault/20-notes/projects/mychelin/current-state.md`.
3. Vault workstream: `/home/cluser/second-brain-vault/90-system/workstreams/mychelin.md`.
4. Vault hot/index: `/home/cluser/second-brain-vault/hot.md`, `/home/cluser/second-brain-vault/index.md`.
5. Repo docs: `README.md`, `DEPLOYMENT.md`, `MEMORY.md`, `MYCHELIN.md`.
6. Task-specific files under `app/` unless the task is repo/deployment wrapper work.

## Local rules

- Production deploys from repo root: `cd /home/cluser/projects/mychelin && vercel --prod`.
- Do not deploy from `app/`; that targets the wrong Vercel project/site.
- Production app code lives under `app/`.
- New API routes should use Edge runtime; Node serverless POST routes are known to hang on this Vercel project.
- Keep DB/env/secrets out of commits and vault notes.
