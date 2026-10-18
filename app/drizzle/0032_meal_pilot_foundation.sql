-- Multi-dish meals, prepared batches, and managed calendar foundation.
-- Additive only: legacy meal_plans remain valid with meal_group_id and
-- target_portions NULL until a user explicitly adopts/edits that slot.

CREATE TABLE `meal_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES users(id) ON DELETE cascade,
	`household_id` integer REFERENCES households(id) ON DELETE cascade,
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`serve_at` text NOT NULL,
	`timezone` text NOT NULL,
	`diner_count` integer NOT NULL,
	`duration_override_minutes` integer,
	`defrost_at_override` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`confirmed_at` text,
	`confirmed_by` integer REFERENCES users(id) ON DELETE set null,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meal_groups_user_date_idx` ON `meal_groups` (`user_id`,`date`);
--> statement-breakpoint
CREATE INDEX `meal_groups_household_date_idx` ON `meal_groups` (`household_id`,`date`);
--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `meal_group_id` integer REFERENCES meal_groups(id) ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `target_portions` real;
--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `planned_output_fridge` real;
--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `planned_output_freezer` real;

--> statement-breakpoint
CREATE TABLE `prepared_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES users(id) ON DELETE cascade,
	`household_id` integer REFERENCES households(id) ON DELETE cascade,
	`recipe_id` integer REFERENCES recipes(id) ON DELETE set null,
	`title` text NOT NULL,
	`cooked_at` text,
	`notes` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `prepared_batches_user_idx` ON `prepared_batches` (`user_id`);
--> statement-breakpoint
CREATE INDEX `prepared_batches_household_idx` ON `prepared_batches` (`household_id`);
--> statement-breakpoint
CREATE TABLE `prepared_lots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batch_id` integer NOT NULL REFERENCES prepared_batches(id) ON DELETE cascade,
	`storage` text NOT NULL,
	`physical_portions` real NOT NULL,
	`use_by_date` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `prepared_lots_batch_idx` ON `prepared_lots` (`batch_id`);
--> statement-breakpoint
CREATE TABLE `prepared_reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meal_group_id` integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
	`lot_id` integer NOT NULL REFERENCES prepared_lots(id) ON DELETE restrict,
	`source_storage` text NOT NULL,
	`planned_portions` real NOT NULL,
	`consumed_portions` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL,
	`reheat_notes` text,
	`idempotency_key` text NOT NULL UNIQUE,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prepared_reservations_meal_lot_idx` ON `prepared_reservations` (`meal_group_id`,`lot_id`);
--> statement-breakpoint
CREATE INDEX `prepared_reservations_lot_idx` ON `prepared_reservations` (`lot_id`,`status`);
--> statement-breakpoint
CREATE TABLE `meal_confirmation_commands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meal_group_id` integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
	`user_id` integer NOT NULL REFERENCES users(id) ON DELETE cascade,
	`idempotency_key` text NOT NULL UNIQUE,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`reverses_command_id` integer,
	`applied_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meal_confirmation_commands_meal_idx` ON `meal_confirmation_commands` (`meal_group_id`);
--> statement-breakpoint
CREATE TABLE `meal_fresh_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meal_group_id` integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
	`meal_plan_id` integer NOT NULL UNIQUE REFERENCES meal_plans(id) ON DELETE cascade,
	`recipe_attempt_id` integer REFERENCES recipe_attempts(id) ON DELETE set null,
	`prepared_batch_id` integer REFERENCES prepared_batches(id) ON DELETE set null,
	`effect_snapshot` text NOT NULL,
	`applied_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meal_fresh_effects_group_idx` ON `meal_fresh_effects` (`meal_group_id`);
--> statement-breakpoint
CREATE TABLE `meal_station_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meal_group_id` integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
	`meal_plan_id` integer REFERENCES meal_plans(id) ON DELETE cascade,
	`reservation_id` integer REFERENCES prepared_reservations(id) ON DELETE cascade,
	`instruction_id` integer REFERENCES instructions(id) ON DELETE set null,
	`station_name` text NOT NULL,
	`start_offset_minutes` integer,
	`duration_minutes` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meal_station_assignments_group_idx` ON `meal_station_assignments` (`meal_group_id`);
--> statement-breakpoint
CREATE TABLE `meal_conflicts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meal_group_id` integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`details` text,
	`resolved_at` text,
	`detected_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meal_conflicts_open_idx` ON `meal_conflicts` (`meal_group_id`,`resolved_at`);

--> statement-breakpoint
CREATE TABLE `calendar_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES users(id) ON DELETE cascade,
	`household_id` integer REFERENCES households(id) ON DELETE cascade,
	`google_account_email` text NOT NULL,
	`granted_scopes` text NOT NULL,
	`calendar_id` text NOT NULL,
	`calendar_name` text NOT NULL,
	`calendar_timezone` text NOT NULL,
	`status` text DEFAULT 'connected' NOT NULL,
	`access_token_ciphertext` text,
	`access_token_iv` text,
	`refresh_token_ciphertext` text NOT NULL,
	`refresh_token_iv` text NOT NULL,
	`access_token_expires_at` text,
	`token_invalidated_at` text,
	`sync_token` text,
	`watch_channel_id` text,
	`watch_resource_id` text,
	`watch_token_hash` text,
	`watch_expires_at` text,
	`last_synced_at` text,
	`last_error` text,
	`disconnected_at` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_connections_active_household_idx` ON `calendar_connections` (`household_id`) WHERE `household_id` IS NOT NULL AND `disconnected_at` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_connections_active_solo_idx` ON `calendar_connections` (`user_id`) WHERE `household_id` IS NULL AND `disconnected_at` IS NULL;
--> statement-breakpoint
CREATE TABLE `calendar_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_id` integer NOT NULL REFERENCES calendar_connections(id) ON DELETE cascade,
	`meal_group_id` integer NOT NULL REFERENCES meal_groups(id) ON DELETE cascade,
	`kind` text NOT NULL,
	`google_event_id` text,
	`google_etag` text,
	`start_at` text,
	`end_at` text,
	`explicit_duration_minutes` integer,
	`state` text DEFAULT 'pending' NOT NULL,
	`desired_revision` integer DEFAULT 0 NOT NULL,
	`synced_revision` integer DEFAULT 0 NOT NULL,
	`source_meal_revision` integer DEFAULT 0 NOT NULL,
	`deleted_externally_at` text,
	`last_error` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_activities_connection_meal_kind_idx` ON `calendar_activities` (`connection_id`,`meal_group_id`,`kind`);
--> statement-breakpoint
CREATE INDEX `calendar_activities_meal_idx` ON `calendar_activities` (`meal_group_id`);
--> statement-breakpoint
CREATE TABLE `calendar_shares` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_id` integer NOT NULL REFERENCES calendar_connections(id) ON DELETE cascade,
	`user_id` integer NOT NULL REFERENCES users(id) ON DELETE cascade,
	`email` text NOT NULL,
	`google_acl_rule_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_shares_connection_user_idx` ON `calendar_shares` (`connection_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `calendar_shares_connection_status_idx` ON `calendar_shares` (`connection_id`,`status`);
--> statement-breakpoint
CREATE TABLE `calendar_sync_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_id` integer NOT NULL REFERENCES calendar_connections(id) ON DELETE cascade,
	`meal_group_id` integer REFERENCES meal_groups(id) ON DELETE cascade,
	`share_id` integer REFERENCES calendar_shares(id) ON DELETE cascade,
	`kind` text,
	`action` text NOT NULL,
	`dedupe_key` text NOT NULL UNIQUE,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`not_before` text NOT NULL,
	`leased_at` text,
	`lease_token` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `calendar_sync_jobs_due_idx` ON `calendar_sync_jobs` (`status`,`not_before`);
--> statement-breakpoint
CREATE INDEX `calendar_sync_jobs_share_idx` ON `calendar_sync_jobs` (`share_id`);
