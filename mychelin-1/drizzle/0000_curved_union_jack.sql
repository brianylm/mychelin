CREATE TABLE `ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` real,
	`unit` text,
	`notes` text,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `instructions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`step_number` integer NOT NULL,
	`content` text NOT NULL,
	`tip` text,
	`image_url` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`cuisine` text,
	`yield` text,
	`prep_time` integer,
	`cook_time` integer,
	`story` text,
	`image_url` text,
	`is_public` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
