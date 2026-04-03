CREATE TABLE `book_tips` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`content` text NOT NULL,
	`added_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `recipe_books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `book_tips_book_idx` ON `book_tips` (`book_id`);--> statement-breakpoint
CREATE INDEX `book_tips_added_by_idx` ON `book_tips` (`added_by`);