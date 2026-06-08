CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id integer PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE cascade,
  weekly_cooking_goal integer NOT NULL DEFAULT 2,
  rhythm_reminders integer NOT NULL DEFAULT 1,
  meal_reminders integer NOT NULL DEFAULT 1,
  prep_reminders integer NOT NULL DEFAULT 1,
  review_reminders integer NOT NULL DEFAULT 1,
  family_activity integer NOT NULL DEFAULT 1,
  reminder_time text NOT NULL DEFAULT '18:00',
  timezone text NOT NULL DEFAULT 'Asia/Singapore',
  updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  disabled_at text,
  last_success_at text,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS notification_jobs (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL DEFAULT '/app',
  due_at text NOT NULL,
  sent_at text,
  canceled_at text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS notification_jobs_due_idx ON notification_jobs(due_at, sent_at, canceled_at);
CREATE INDEX IF NOT EXISTS notification_jobs_user_id_idx ON notification_jobs(user_id);
