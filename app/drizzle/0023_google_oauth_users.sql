ALTER TABLE users ADD COLUMN auth_provider text NOT NULL DEFAULT 'password';
ALTER TABLE users ADD COLUMN google_sub text;
ALTER TABLE users ADD COLUMN email_verified integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx ON users(google_sub) WHERE google_sub IS NOT NULL;
