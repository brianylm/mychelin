-- Households Slice 3: per-recipe share-to-household.
-- All additive/nullable; existing per-user rows are untouched.
-- NULL shared_to_household_at = private (the default for every existing row).
-- Hand-written to match ensureHouseholdSlice3Columns() in
-- src/db/ensure-schema.ts — `npm run db:generate` diffs against a stale
-- snapshot and emits years of unrelated drift (see 0028/0029_households.sql).
ALTER TABLE `recipes` ADD `shared_to_household_at` text;
--> statement-breakpoint
ALTER TABLE `recipes` ADD `shared_to_household_by` integer REFERENCES users(id);
