CREATE TABLE IF NOT EXISTS recipe_next_tries (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  recipe_id integer NOT NULL REFERENCES recipes(id) ON DELETE cascade,
  source_attempt_id integer REFERENCES recipe_attempts(id) ON DELETE set null,
  source_version_id integer REFERENCES recipe_versions(id) ON DELETE set null,
  user_id integer REFERENCES users(id) ON DELETE cascade,
  status text NOT NULL DEFAULT 'active',
  notes text,
  ingredients text,
  instructions text,
  promoted_version_id integer REFERENCES recipe_versions(id) ON DELETE set null,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS recipe_next_tries_recipe_id_idx ON recipe_next_tries(recipe_id);
CREATE INDEX IF NOT EXISTS recipe_next_tries_user_id_idx ON recipe_next_tries(user_id);
CREATE INDEX IF NOT EXISTS recipe_next_tries_status_idx ON recipe_next_tries(status);
CREATE INDEX IF NOT EXISTS recipe_next_tries_source_attempt_id_idx ON recipe_next_tries(source_attempt_id);
CREATE INDEX IF NOT EXISTS recipe_next_tries_source_version_id_idx ON recipe_next_tries(source_version_id);
