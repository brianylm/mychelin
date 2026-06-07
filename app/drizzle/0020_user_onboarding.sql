ALTER TABLE users ADD COLUMN onboarding_completed integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN cooking_goal text;
ALTER TABLE users ADD COLUMN cooking_frequency text;
ALTER TABLE users ADD COLUMN first_capture_mode text;
