CREATE TABLE IF NOT EXISTS recipe_attempts (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  recipe_id integer NOT NULL REFERENCES recipes(id) ON DELETE cascade,
  version_id integer REFERENCES recipe_versions(id) ON DELETE set null,
  meal_plan_id integer REFERENCES meal_plans(id) ON DELETE set null,
  user_id integer REFERENCES users(id) ON DELETE cascade,
  cooked_at text NOT NULL,
  rating real,
  notes text,
  change_notes text,
  what_worked text,
  next_time text,
  ingredients_snapshot text,
  instructions_snapshot text,
  promoted_version_id integer REFERENCES recipe_versions(id) ON DELETE set null,
  created_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS recipe_attempts_recipe_id_idx ON recipe_attempts(recipe_id);
CREATE INDEX IF NOT EXISTS recipe_attempts_user_id_idx ON recipe_attempts(user_id);
CREATE INDEX IF NOT EXISTS recipe_attempts_version_id_idx ON recipe_attempts(version_id);
CREATE INDEX IF NOT EXISTS recipe_attempts_meal_plan_id_idx ON recipe_attempts(meal_plan_id);
