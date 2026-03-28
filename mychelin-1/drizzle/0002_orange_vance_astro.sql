CREATE TABLE `recipe_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`blob_url` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`created_at` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`avatar_url` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `voice_recordings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`blob_url` text NOT NULL,
	`duration` integer NOT NULL,
	`label` text,
	`sort_order` integer DEFAULT 0,
	`created_at` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `recipes` ADD `user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `recipes` ADD `origin` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `dialect` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `occasion` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `family_member` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `generation` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `authenticity_rating` integer;--> statement-breakpoint
ALTER TABLE `recipes` ADD `taste_rating` integer;--> statement-breakpoint
ALTER TABLE `recipes` ADD `nostalgia_rating` integer;