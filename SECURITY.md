# Security Policy

Mychelin handles potentially sensitive family material: recipes, photos, voice recordings, stories, account data, and sharing permissions. Please report security and privacy issues privately.

## Reporting a vulnerability

Email the maintainer or contact the repository owner privately with:

- A short description of the issue
- Steps to reproduce, if safe to share
- Affected URLs, files, or API routes
- Potential impact
- Any suggested mitigation

Please do **not** open a public GitHub issue for vulnerabilities, auth bypasses, data leaks, exposed secrets, or privacy failures.

## Sensitive areas

Extra care is needed around:

- Authentication and session cookies
- Recipe-book invitations and sharing permissions
- Voice recordings, uploaded photos, and generated transcripts
- AI extraction/transcription requests that may contain private family data
- Database migrations and seed/test data

## Safe handling expectations

- Do not include real secrets, tokens, private recipes, voice files, or personal family data in issues or PRs.
- Use synthetic data in tests and screenshots.
- If you accidentally expose a secret, rotate it immediately and mention the exposure privately.

The project is early-stage; responsible reports are appreciated and will be prioritised.
