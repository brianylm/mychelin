CREATE TABLE `book_tips` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`content` text NOT NULL,
	`added_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `recipes` ADD `forked_from` text;