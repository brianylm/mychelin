import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
// Use the /web export so the client works on both Node and Edge runtimes.
// The default @libsql/client uses Node-specific APIs that break on edge,
// and on this Vercel deployment the Node serverless runtime is also broken
// for POST requests — edge is the only working path.
import { createClient, type Client } from "@libsql/client/web";
import * as schema from "./schema";

// Lazy initialization - client is only created on first access.
// This prevents a bad env var or libsql parsing error from crashing
// the entire serverless function container at import time.
let _client: Client | null = null;
let _db: LibSQLDatabase<typeof schema> | null = null;

function getClient(): Client {
  if (_client) return _client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL environment variable is not set");
  }

  _client = createClient({ url, authToken });
  return _client;
}

export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, prop) {
    if (!_db) {
      _db = drizzle(getClient(), { schema });
    }
    return Reflect.get(_db, prop);
  },
});
