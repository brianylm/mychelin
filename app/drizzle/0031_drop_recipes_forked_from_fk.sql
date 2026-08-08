-- Rebuild the `recipes` table WITHOUT the spurious self-referential
-- foreign key `forked_from REFERENCES recipes(id)`.
--
-- Background: `forked_from` holds lineage text ("<id>:<title>") and is
-- defined as plain text in schema.ts, but a hand-edit of an old migration
-- left a self-referential FK on the column in the live DB. That FK breaks
-- every fork (share-save + household import). SQLite cannot drop a column
-- FK in place, so we rebuild the table:
--   1. create recipes_new (same schema, forked_from is plain text)
--   2. copy all rows
--   3. drop the old table
--   4. rename recipes_new -> recipes
--   5. restore the AUTOINCREMENT sequence (ids were burned up to 303)
--
-- Execution note: this must run with `PRAGMA foreign_keys = OFF` for the
-- DROP to succeed (children reference recipes), inside a transaction, and
-- with enforcement restored afterwards. scripts/rebuild-recipes-drop-fork-fk.mjs
-- handles that; run `--commit` only after the dry-run verifies clean.

CREATE TABLE "recipes_new" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "cuisine" text,
  "yield" text,
  "prep_time" integer,
  "cook_time" integer,
  "story" text,
  "image_url" text,
  "is_public" integer DEFAULT false,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL,
  "user_id" integer REFERENCES users(id) ON DELETE CASCADE,
  "origin" text,
  "dialect" text,
  "occasion" text,
  "family_member" text,
  "generation" text,
  `authenticity_rating` integer,
  `taste_rating` integer,
  `nostalgia_rating` integer,
  "book_id" integer REFERENCES books(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  "forked_from" text,
  "active_version_id" integer,
  `status` text DEFAULT 'active' NOT NULL,
  `source_url` text,
  "shared_to_household_at" text,
  "shared_to_household_by" integer REFERENCES users(id)
);
--> statement-breakpoint
INSERT INTO "recipes_new" (id, title, description, cuisine, "yield", prep_time, cook_time, story, image_url, is_public, created_at, updated_at, user_id, origin, dialect, occasion, family_member, generation, authenticity_rating, taste_rating, nostalgia_rating, book_id, forked_from, active_version_id, status, source_url, shared_to_household_at, shared_to_household_by)
SELECT id, title, description, cuisine, "yield", prep_time, cook_time, story, image_url, is_public, created_at, updated_at, user_id, origin, dialect, occasion, family_member, generation, authenticity_rating, taste_rating, nostalgia_rating, book_id, forked_from, active_version_id, status, source_url, shared_to_household_at, shared_to_household_by
FROM "recipes";
--> statement-breakpoint
DROP TABLE "recipes";
--> statement-breakpoint
ALTER TABLE "recipes_new" RENAME TO "recipes";
--> statement-breakpoint
DELETE FROM sqlite_sequence WHERE name IN ('recipes', 'recipes_new');
--> statement-breakpoint
INSERT INTO sqlite_sequence (name, seq) VALUES ('recipes', 303);
