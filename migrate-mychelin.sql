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
-- Data
INSERT INTO users (id,name,email,password_hash,avatar_url,created_at,cooking_skill_level,household_size,favorite_cuisines,dietary_restrictions) VALUES (1,'B','brianyaplm@hotmail.com','$2b$12$lyhGhkmR4ym3nrSO4SuEY.qMozWWxqVqrNa9KNtu8xotPUq8hgeRW',NULL,'2026-03-26T10:42:17.570Z',NULL,NULL,NULL,NULL);
INSERT INTO books (id,title,description,cover_emoji,cover_color,created_by,is_public,created_at,updated_at) VALUES (1,'Brian''s recipes',NULL,'🍳','sky',1,0,'2026-03-29T09:38:37.902Z','2026-03-29T09:38:37.902Z');
INSERT INTO books (id,title,description,cover_emoji,cover_color,created_by,is_public,created_at,updated_at) VALUES (2,'Yap Fam',NULL,'🍳','amber',1,0,'2026-03-29T09:44:06.648Z','2026-03-29T09:44:06.648Z');
INSERT INTO books (id,title,description,cover_emoji,cover_color,created_by,is_public,created_at,updated_at) VALUES (3,'Chiok Fam',NULL,'🍜','emerald',1,0,'2026-03-29T10:48:26.522Z','2026-03-29T10:48:26.522Z');
INSERT INTO books (id,title,description,cover_emoji,cover_color,created_by,is_public,created_at,updated_at) VALUES (4,'Extended Yap Fam',NULL,'🍛','amber',1,0,'2026-03-29T10:48:42.335Z','2026-03-29T10:48:42.335Z');
INSERT INTO books (id,title,description,cover_emoji,cover_color,created_by,is_public,created_at,updated_at) VALUES (5,'Teng Fam',NULL,'🥗','violet',1,0,'2026-03-29T10:48:55.261Z','2026-03-29T10:48:55.261Z');
INSERT INTO recipes (id,title,description,cuisine,yield,prep_time,cook_time,story,image_url,is_public,created_at,updated_at,user_id,origin,dialect,occasion,family_member,generation,authenticity_rating,taste_rating,nostalgia_rating,book_id,forked_from,active_version_id) VALUES (2,'Bawan','Used in BR steamboat. ',NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-03-28T10:17:38.439Z','2026-03-29T10:49:41.854Z',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,NULL);
INSERT INTO recipes (id,title,description,cuisine,yield,prep_time,cook_time,story,image_url,is_public,created_at,updated_at,user_id,origin,dialect,occasion,family_member,generation,authenticity_rating,taste_rating,nostalgia_rating,book_id,forked_from,active_version_id) VALUES (3,'Arrabiata',NULL,'5',NULL,NULL,'I first made this when I was learning how to cook from my parents. I added the charring of the mince later when I got slightly better at cooking.',NULL,0,'2026-03-28T10:19:08.698Z','2026-03-29T09:43:30.502Z',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL);
INSERT INTO recipes (id,title,description,cuisine,yield,prep_time,cook_time,story,image_url,is_public,created_at,updated_at,user_id,origin,dialect,occasion,family_member,generation,authenticity_rating,taste_rating,nostalgia_rating,book_id,forked_from,active_version_id) VALUES (4,'Roasted veg (fancy)','Pretty roast veg platter',NULL,'8',45,45,NULL,NULL,0,'2026-03-29T09:47:56.057Z','2026-03-29T09:48:42.855Z',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (14,3,NULL,'Pasta of choice',500,'g',NULL,0);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (15,3,NULL,'Pasta sauce (tomato and basil)',500,'g',NULL,1);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (16,3,NULL,'Tomato paste',160,'g',NULL,2);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (17,3,NULL,'Garlic (diced)',2,'tbsp',NULL,3);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (18,3,NULL,'Pork mince (fatty)',500,'g',NULL,4);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (19,3,NULL,'Chilli padi',3,'pcs',NULL,5);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (20,3,NULL,'Pepper',NULL,'pinch',NULL,6);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (21,3,NULL,'Italian herbs',NULL,'pinch',NULL,7);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (22,2,NULL,'Garlic',1,'tbsp',NULL,0);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (23,2,NULL,'Pork mince',500,'g',NULL,1);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (24,2,NULL,'Fish paste',200,'g',NULL,2);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (25,4,NULL,'Yellow zucchini',200,'g',NULL,0);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (26,4,NULL,'Pumpkin',500,'g',NULL,1);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (27,4,NULL,'Cherry tomatoes',200,'g',NULL,2);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (28,4,NULL,'Shiitake mushrooms',150,'g',NULL,3);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (29,4,NULL,'Broccoli',2,'pcs',NULL,4);
INSERT INTO ingredients (id,recipe_id,catalog_ingredient_id,name,quantity,unit,notes,sort_order) VALUES (30,4,NULL,'Carrots',2,'pcs',NULL,5);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (8,3,1,'Pan fry pork mince until slight char on medium high heat. Add pepper, Italian herbs, some salt. Ensure that oil comes out of pork mince; use that lard to fry next.',NULL,NULL);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (9,3,2,'Add oil if needed. Pan fry chilli padi, sliced and deseeded.',NULL,NULL);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (10,3,3,'Add garlic till fragrant.',NULL,NULL);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (11,3,4,'Add pasta sauce and tomato paste. Add some pasta water for volume where needed.',NULL,NULL);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (12,2,1,'Mix all ingredients together',NULL,NULL);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (13,2,2,'Serve',NULL,NULL);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (14,4,1,'Cut all veggies to bite size.',NULL,NULL);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (15,4,2,'Add pumpkin and carrots together, toss with oil, pepper, salt, garlic powder.',NULL,NULL);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (16,4,3,'Roast at 230deg for 20 mins',NULL,NULL);
INSERT INTO instructions (id,recipe_id,step_number,content,tip,image_url) VALUES (17,4,4,'Add broccoli, zucchini, peppers, mushrooms. Roast for another 20 mins',NULL,NULL);
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (1,'2026-03-23','breakfast',3,1,NULL,'2026-03-28T15:56:09.100Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (3,'2026-03-23','dinner',2,1,NULL,'2026-03-28T15:56:11.292Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (4,'2026-03-23','snack',3,1,NULL,'2026-03-28T15:56:11.860Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (6,'2026-03-24','lunch',2,1,NULL,'2026-03-28T15:56:13.024Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (8,'2026-03-24','snack',3,1,NULL,'2026-03-28T15:56:14.457Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (10,'2026-03-25','lunch',2,1,NULL,'2026-03-28T15:56:15.589Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (11,'2026-03-25','dinner',3,1,NULL,'2026-03-28T15:56:16.140Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (12,'2026-03-25','snack',3,1,NULL,'2026-03-28T15:56:16.696Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (13,'2026-03-26','breakfast',2,1,NULL,'2026-03-28T15:56:17.261Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (15,'2026-03-26','dinner',3,1,NULL,'2026-03-28T15:56:18.391Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (16,'2026-03-26','snack',3,1,NULL,'2026-03-28T15:56:18.960Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (17,'2026-03-27','breakfast',3,1,NULL,'2026-03-28T15:56:19.531Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (19,'2026-03-27','dinner',2,1,NULL,'2026-03-28T15:56:20.708Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (22,'2026-03-28','lunch',3,1,NULL,'2026-03-28T15:56:22.474Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (23,'2026-03-28','dinner',2,1,NULL,'2026-03-28T15:56:23.070Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (25,'2026-03-29','breakfast',2,1,NULL,'2026-03-28T15:56:24.203Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (26,'2026-03-29','lunch',3,1,NULL,'2026-03-28T15:56:24.790Z');
INSERT INTO meal_plans (id,date,meal_type,recipe_id,servings,notes,created_at) VALUES (28,'2026-03-29','snack',2,1,NULL,'2026-03-28T15:56:25.922Z');
INSERT INTO voice_recordings (id,recipe_id,blob_url,duration,label,sort_order,created_at) VALUES (1,4,'https://6scfmrz0eqgyucwj.public.blob.vercel-storage.com/recipes/4/voice/1774862420133.webm',3,NULL,0,'2026-03-30T09:20:21.394Z');
INSERT INTO recipe_photos (id,recipe_id,blob_url,sort_order,created_at) VALUES (1,4,'https://6scfmrz0eqgyucwj.public.blob.vercel-storage.com/recipes/4/photos/1774783473561-1000091048.jpg',0,'2026-03-29T11:24:36.930Z');
INSERT INTO book_activity_log (id,book_id,user_id,action,target_name,created_at) VALUES (1,1,1,'created_book','Brian''s recipes','2026-03-29T09:38:39.132Z');
INSERT INTO book_activity_log (id,book_id,user_id,action,target_name,created_at) VALUES (2,2,1,'created_book','Yap Fam','2026-03-29T09:44:07.902Z');
INSERT INTO book_activity_log (id,book_id,user_id,action,target_name,created_at) VALUES (3,3,1,'created_book','Chiok Fam','2026-03-29T10:48:27.772Z');
INSERT INTO book_activity_log (id,book_id,user_id,action,target_name,created_at) VALUES (4,4,1,'created_book','Extended Yap Fam','2026-03-29T10:48:43.416Z');
INSERT INTO book_activity_log (id,book_id,user_id,action,target_name,created_at) VALUES (5,5,1,'created_book','Teng Fam','2026-03-29T10:48:56.349Z');
INSERT INTO book_members (id,book_id,user_id,role,joined_at) VALUES (1,1,1,'owner','2026-03-29T09:38:38.669Z');
INSERT INTO book_members (id,book_id,user_id,role,joined_at) VALUES (2,2,1,'owner','2026-03-29T09:44:07.450Z');
INSERT INTO book_members (id,book_id,user_id,role,joined_at) VALUES (3,3,1,'owner','2026-03-29T10:48:27.308Z');
INSERT INTO book_members (id,book_id,user_id,role,joined_at) VALUES (4,4,1,'owner','2026-03-29T10:48:42.956Z');
INSERT INTO book_members (id,book_id,user_id,role,joined_at) VALUES (5,5,1,'owner','2026-03-29T10:48:55.887Z');
INSERT INTO share_links (id,token,resource_type,resource_id,permission,created_by,created_at) VALUES (1,'d10a14c865fc44cf','book',1,'view',1,'2026-03-30T05:29:34.520Z');
