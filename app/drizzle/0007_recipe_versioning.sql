CREATE TABLE `recipe_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`version_number` integer NOT NULL,
	`source_version_id` integer,
	`capture_method` text DEFAULT 'manual',
	`ingredients` text,
	`instructions` text,
	`notes` text,
	`changed_by` integer,
	`change_note` text,
	`closeness_rating` integer,
	`closeness_notes` text,
	`cooking_session_date` integer,
	`photos` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `recipes` ADD `active_version_id` integer;
--> statement-breakpoint
