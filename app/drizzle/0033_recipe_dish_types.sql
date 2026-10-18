-- Owner override for a recipe's automatic dish type (meat, veg, egg...).
-- Additive; mirrors ensureRecipeDishTypesTable in src/db/ensure-schema.ts.
CREATE TABLE IF NOT EXISTS `recipe_dish_types` (
	`recipe_id` integer PRIMARY KEY NOT NULL REFERENCES recipes(id) ON DELETE cascade,
	`dish_types` text NOT NULL,
	`updated_at` text NOT NULL
);
