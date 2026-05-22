ALTER TABLE `recipe_versions` ADD `version_label` text;
--> statement-breakpoint
UPDATE `recipe_versions` SET `version_label` = CAST(`version_number` AS TEXT) WHERE `version_label` IS NULL;
