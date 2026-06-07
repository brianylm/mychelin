ALTER TABLE `meal_plans` ADD `user_id` integer REFERENCES users(id) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `inventory` ADD `user_id` integer REFERENCES users(id) ON DELETE cascade;--> statement-breakpoint
UPDATE `meal_plans`
SET `user_id` = (SELECT `id` FROM `users` ORDER BY `id` LIMIT 1)
WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `inventory`
SET `user_id` = (SELECT `id` FROM `users` ORDER BY `id` LIMIT 1)
WHERE `user_id` IS NULL;
