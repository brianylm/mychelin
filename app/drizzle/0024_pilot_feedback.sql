CREATE TABLE IF NOT EXISTS pilot_feedback (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer REFERENCES users(id) ON DELETE cascade,
  stage text NOT NULL,
  rating integer,
  comment text,
  source text,
  created_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS pilot_feedback_user_id_idx ON pilot_feedback(user_id);
CREATE INDEX IF NOT EXISTS pilot_feedback_stage_idx ON pilot_feedback(stage);
CREATE INDEX IF NOT EXISTS pilot_feedback_created_at_idx ON pilot_feedback(created_at);
