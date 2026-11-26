-- Mychelin Tokyo DB migration script
-- Run this AFTER creating mychelin-us in Turso dashboard

-- Schema
CREATE TABLE IF NOT EXISTS "books" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "cover_emoji" text DEFAULT '📚',
  "cover_color" text DEFAULT 'amber',
  "created_by" integer NOT NULL,
  "is_public" integer DEFAULT false,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL,
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "avatar_url" text,
  "created_at" text NOT NULL,
  "cooking_skill_level" text,
  "household_size" integer,
  "favorite_cuisines" text,
  "dietary_restrictions" text
);

CREATE TABLE IF NOT EXISTS "recipes" (
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
  "authenticity_rating" integer,
  "taste_rating" integer,
  "nostalgia_rating" integer,
  "book_id" integer REFERENCES books(id) ON DELETE set null,
  "forked_from" TEXT REFERENCES recipes(id),
  "active_version_id" integer
);

CREATE TABLE IF NOT EXISTS "ingredients" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "recipe_id" integer NOT NULL,
  "catalog_ingredient_id" integer,
  "name" text NOT NULL,
  "quantity" real,
  "unit" text,
  "notes" text,
  "sort_order" integer DEFAULT 0,
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "instructions" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "recipe_id" integer NOT NULL,
  "step_number" integer NOT NULL,
  "content" text NOT NULL,
  "tip" text,
  "image_url" text,
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "ingredient_catalog" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" text NOT NULL UNIQUE,
  "category" text,
  "default_unit" text
);

CREATE TABLE IF NOT EXISTS "meal_plans" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "date" text NOT NULL,
  "meal_type" text NOT NULL,
  "recipe_id" integer NOT NULL,
  "servings" real DEFAULT 1 NOT NULL,
  "notes" text,
  "created_at" text NOT NULL,
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "inventory" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "catalog_ingredient_id" integer,
  "name" text NOT NULL,
  "quantity" real NOT NULL,
  "unit" text NOT NULL,
  "location" text,
  "expiry_date" text,
  "updated_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "voice_recordings" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "recipe_id" integer NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  "blob_url" text NOT NULL,
  "duration" integer NOT NULL,
  "label" text,
  "sort_order" integer DEFAULT 0,
  "created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_photos" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "recipe_id" integer NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  "blob_url" text NOT NULL,
  "sort_order" integer DEFAULT 0,
  "created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "book_activity_log" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "book_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "action" text NOT NULL,
  "target_name" text,
  "created_at" text NOT NULL,
  FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "book_members" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "book_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "role" text NOT NULL,
  "joined_at" text NOT NULL,
  FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "book_recipes" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "book_id" integer NOT NULL,
  "recipe_id" integer NOT NULL,
  "added_by" integer NOT NULL,
  "sort_order" integer DEFAULT 0,
  "added_at" text NOT NULL,
  FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade,
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE cascade,
  FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE no action
);

CREATE TABLE IF NOT EXISTS "share_links" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "token" text NOT NULL UNIQUE,
  "resource_type" text NOT NULL,
  "resource_id" integer NOT NULL,
  "permission" text NOT NULL,
  "created_by" integer NOT NULL,
  "created_at" text NOT NULL,
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "book_tips" (
  "id" text PRIMARY KEY NOT NULL,
  "book_id" text NOT NULL,
  "content" text NOT NULL,
  "added_by" text NOT NULL,
  "created_at" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
  "id" SERIAL PRIMARY KEY,
  "hash" text NOT NULL,
  "created_at" numeric
);

CREATE TABLE IF NOT EXISTS "recipe_versions" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "recipe_id" integer NOT NULL,
  "version_number" integer NOT NULL,
  "source_version_id" integer,
  "capture_method" text DEFAULT 'manual',
  "ingredients" text,
  "instructions" text,
  "notes" text,
  "changed_by" integer,
  "change_note" text,
  "closeness_rating" integer,
  "closeness_notes" text,
  "cooking_session_date" integer,
  "photos" text,
  "created_at" text NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE cascade,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE no action
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "ingredient_catalog_name_unique" ON "ingredient_catalog" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "share_links_token_unique" ON "share_links" ("token");
-- Data section removed 2026-11-26: it held a personal data dump (user row, recipes,
-- media links). This file is a historical schema snapshot; never commit real data.
