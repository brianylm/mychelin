-- Households Slice 2: shared inventory, shared shopping list, ghost slots.
-- All additive/nullable; existing per-user rows are untouched
-- (inventory.household_id stays NULL = personal; shopping_list_items only
-- ever gets household rows in v1 — solo lists stay generated-on-read).
-- Hand-written to match ensureHouseholdSlice2Tables() in
-- src/db/ensure-schema.ts — `npm run db:generate` diffs against a stale
-- snapshot and emits years of unrelated drift (see 0028_households.sql).
ALTER TABLE `inventory` ADD `household_id` integer REFERENCES households(id) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `ghost_title` text;
--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `ghost_yield` text;
--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `ghosted_at` text;
--> statement-breakpoint
CREATE TABLE `shopping_list_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` integer REFERENCES households(id) ON DELETE cascade,
	`user_id` integer REFERENCES users(id) ON DELETE cascade,
	`item_key` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`unit` text DEFAULT '' NOT NULL,
	`quantity` real,
	`approximate` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'generated' NOT NULL,
	`catalog_ingredient_id` integer REFERENCES ingredient_catalog(id),
	`ticked_by` integer REFERENCES users(id),
	`ticked_at` text,
	`moved_by` integer REFERENCES users(id),
	`moved_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shopping_list_items_unique_idx` ON `shopping_list_items` (`household_id`,`item_key`);
