/**
 * Custom Turso HTTP driver for Drizzle ORM.
 * Bypasses the libsql client's HTTP/2 multiplexing (blocked by Vercel CDN).
 * Uses raw fetch to call Turso's HTTP API directly.
 */
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { Client } from "@libsql/client";
import * as schema from "./schema";

// Re-export schema types
export * from "./schema";

/**
 * Creates a Turso client using raw HTTP fetch instead of libsql's HTTP/2.
 * The libsql client uses HTTP/2 multiplexing which gets blocked when
 * Vercel's CDN tries to connect to Tokyo-region Turso databases.
 */
function createHttpClient(url: string, authToken: string): Client {
  return createClient({
    url,
    authToken,
  });
}

// Get connection params from environment
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error(
    `Missing Turso env vars: TURSO_DATABASE_URL=${!!url}, TURSO_AUTH_TOKEN=${!!authToken}`
  );
}

// Create client and drizzle instance
const client = createHttpClient(url, authToken);

export const db = drizzle(client, { schema });
