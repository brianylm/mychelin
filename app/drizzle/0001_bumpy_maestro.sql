CREATE TABLE `ingredient_catalog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`default_unit` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_catalog_name_unique` ON `ingredient_catalog` (`name`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_ingredient_id` integer,
	`name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`location` text,
	`expiry_date` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`catalog_ingredient_id`) REFERENCES `ingredient_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meal_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`recipe_id` integer NOT NULL,
	`servings` real DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `ingredients` ADD `catalog_ingredient_id` integer REFERENCES ingredient_catalog(id);