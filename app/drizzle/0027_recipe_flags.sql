CREATE TABLE IF NOT EXISTS recipe_flags (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  recipe_id integer NOT NULL REFERENCES recipes(id) ON DELETE cascade,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
  flag text NOT NULL,
  created_at text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS recipe_flags_unique_idx ON recipe_flags(recipe_id, user_id, flag);
CREATE INDEX IF NOT EXISTS recipe_flags_user_id_idx ON recipe_flags(user_id);
CREATE INDEX IF NOT EXISTS recipe_flags_recipe_id_idx ON recipe_flags(recipe_id);
