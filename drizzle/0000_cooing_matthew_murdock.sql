CREATE TABLE `book_members` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `recipe_books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `book_members_book_idx` ON `book_members` (`book_id`);--> statement-breakpoint
CREATE INDEX `book_members_user_idx` ON `book_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `fridge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` real,
	`unit` text,
	`category` text,
	`expiry_date` integer,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fridge_user_idx` ON `fridge_items` (`user_id`);--> statement-breakpoint
CREATE TABLE `meal_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recipe_id` text,
	`date` integer NOT NULL,
	`meal_type` text NOT NULL,
	`notes` text,
	`completed` integer DEFAULT false,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `meal_plans_user_date_idx` ON `meal_plans` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `recipe_books` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cover_image_url` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`ingredients` text,
	`instructions` text,
	`notes` text,
	`changed_by` text,
	`change_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `versions_recipe_idx` ON `recipe_versions` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text,
	`title` text NOT NULL,
	`description` text,
	`image_url` text,
	`story` text,
	`origin` text,
	`family_member` text,
	`cuisine` text,
	`category` text,
	`tags` text,
	`prep_time` integer,
	`cook_time` integer,
	`servings` integer,
	`difficulty` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `recipe_books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recipes_book_idx` ON `recipes` (`book_id`);--> statement-breakpoint
CREATE INDEX `recipes_cuisine_idx` ON `recipes` (`cuisine`);--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` real,
	`unit` text,
	`category` text,
	`checked` integer DEFAULT false,
	`from_meal_plan` text,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_meal_plan`) REFERENCES `meal_plans`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `shopping_user_idx` ON `shopping_items` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`favorite_cuisines` text,
	`dietary_restrictions` text,
	`cooking_skill_level` text,
	`household_size` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_preferences_user_id_unique` ON `user_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`avatar_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);