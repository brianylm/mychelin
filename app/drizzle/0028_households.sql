-- Households Slice 1: membership + shared meal plan with per-member blocking.
-- All additive: four new tables, one nullable column on meal_plans.
-- Existing per-user rows are untouched (household_id stays NULL = personal).
-- deleted_at on households is reserved for the Slice 2 30-day deletion flow;
-- no logic reads it yet.
-- Hand-written to match ensureHouseholdTables() in src/db/ensure-schema.ts —
-- `npm run db:generate` currently diffs against a stale snapshot (meta only
-- has snapshots through 0008) and emits years of unrelated drift, so the
-- generated output was discarded.
CREATE TABLE `households` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`join_code` text NOT NULL UNIQUE,
	`created_by` integer NOT NULL REFERENCES users(id) ON DELETE cascade,
	`deleted_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `household_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` integer NOT NULL REFERENCES households(id) ON DELETE cascade,
	`user_id` integer NOT NULL REFERENCES users(id) ON DELETE cascade,
	`role` text NOT NULL,
	`joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `household_members_unique_idx` ON `household_members` (`household_id`,`user_id`);
--> statement-breakpoint
CREATE TABLE `household_activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` integer NOT NULL REFERENCES households(id) ON DELETE cascade,
	`user_id` integer NOT NULL REFERENCES users(id) ON DELETE cascade,
	`action` text NOT NULL,
	`target_name` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `household_activity_log_household_idx` ON `household_activity_log` (`household_id`);
--> statement-breakpoint
CREATE TABLE `household_member_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` integer NOT NULL REFERENCES households(id) ON DELETE cascade,
	`user_id` integer NOT NULL REFERENCES users(id) ON DELETE cascade,
	`scope` text NOT NULL,
	`date` text NOT NULL,
	`meal_type` text DEFAULT '' NOT NULL,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `household_member_blocks_unique_idx` ON `household_member_blocks` (`household_id`,`user_id`,`scope`,`date`,`meal_type`);
--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `household_id` integer REFERENCES households(id) ON DELETE cascade;
