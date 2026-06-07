CREATE TABLE IF NOT EXISTS usage_events (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer REFERENCES users(id) ON DELETE set null,
  event_name text NOT NULL,
  source text,
  recipe_id integer REFERENCES recipes(id) ON DELETE set null,
  book_id integer REFERENCES books(id) ON DELETE set null,
  meal_plan_id integer REFERENCES meal_plans(id) ON DELETE set null,
  properties text,
  path text,
  created_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS usage_events_user_id_idx ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS usage_events_event_name_idx ON usage_events(event_name);
CREATE INDEX IF NOT EXISTS usage_events_created_at_idx ON usage_events(created_at);
CREATE INDEX IF NOT EXISTS usage_events_recipe_id_idx ON usage_events(recipe_id);
CREATE INDEX IF NOT EXISTS usage_events_meal_plan_id_idx ON usage_events(meal_plan_id);
