-- Email verification links. One row per link sent at signup or on resend;
-- `email` is the address the link went to, so a link only verifies the
-- account while users.email still equals it. Only the SHA-256 hash of the
-- token is stored. used_at is set when the link is used or superseded by a
-- newer link. Additive: no existing rows change; users.email_verified
-- already exists (default 0).
-- Mirrors ensureEmailVerificationTokensTable in src/db/ensure-schema.ts.
CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `email_verification_tokens_token_hash_unique` ON `email_verification_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_verification_tokens_user_id_idx` ON `email_verification_tokens` (`user_id`);
