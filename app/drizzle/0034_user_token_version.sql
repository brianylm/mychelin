-- Session revocation: every auth JWT carries the user's token_version ("tv")
-- and is rejected once it no longer matches. Bumped on password change,
-- password reset, "sign out of all devices", and Google linking of an
-- unverified password account. Additive; existing rows get 0, so every
-- current session (tokens without tv are treated as 0) stays valid.
-- Mirrors ensureUserTokenVersionColumn in src/db/ensure-schema.ts.
ALTER TABLE `users` ADD `token_version` integer DEFAULT 0 NOT NULL;
