#!/usr/bin/env node

/**
 * Batch AI-beautify: paints painterly variants of recipe photos for one
 * user. Idempotent — recipes that already have a generated variant are
 * skipped, so the script can be re-run safely after a rate-limit stop.
 *
 * Usage:
 *   node scripts/beautify-batch.mjs --env /tmp/mychelin-prod.env --user 1 [--all-photos] [--dry-run]
 *
 * --env        env file with TURSO_DATABASE_URL, TURSO_AUTH_TOKEN,
 *              GOOGLE_API_KEY, BLOB_READ_WRITE_TOKEN (vercel env pull)
 * --user       user id (default 1)
 * --all-photos paint every upload, not just cover photos
 * --dry-run    list what would be painted, change nothing
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";

const args = process.argv.slice(2);
function argValue(name) {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : null;
}
const ENV_FILE = argValue("env");
const USER_ID = Number(argValue("user") || "1");
const ALL_PHOTOS = args.includes("--all-photos");
const DRY_RUN = args.includes("--dry-run");

if (!ENV_FILE || !existsSync(ENV_FILE)) {
  console.error("Pass --env <file> (vercel env pull <file> --environment=production)");
  process.exit(2);
}

for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

const STYLE_PROMPT = [
  "Repaint this dish photo as a warm painterly oil painting in a soft,",
  "appetizing editorial style: visible brush strokes, warm cream and",
  "peach background, gentle natural light. Keep the dish, tableware,",
  "and arrangement clearly recognizable. No text, no watermark, no people.",
].join(" ");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function toBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function beautify(imageBytes, mimeType) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY missing in env file");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: STYLE_PROMPT }, { inlineData: { mimeType, data: toBase64(imageBytes) } }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Gemini image failed (${res.status}): ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) return fromBase64(part.inlineData.data);
  }
  throw new Error("Gemini returned no image");
}

async function ensureSourceColumns() {
  const cols = (await db.execute("PRAGMA table_info(recipe_photos)")).rows.map((r) => r.name);
  if (!cols.includes("source")) {
    await db.execute("ALTER TABLE recipe_photos ADD COLUMN source text NOT NULL DEFAULT 'upload'");
    console.log("migrated: added recipe_photos.source");
  }
  if (!cols.includes("source_photo_id")) {
    await db.execute("ALTER TABLE recipe_photos ADD COLUMN source_photo_id integer");
    console.log("migrated: added recipe_photos.source_photo_id");
  }
}

async function main() {
  await ensureSourceColumns();

  const recipes = await db.execute({
    sql: `SELECT id, title, image_url FROM recipes WHERE user_id = ? ORDER BY id`,
    args: [USER_ID],
  });

  // Work list: one row per (recipe, sourcePhoto) to paint.
  const work = [];
  for (const recipe of recipes.rows) {
    const photos = (
      await db.execute({
        sql: `SELECT id, blob_url, source, source_photo_id, sort_order FROM recipe_photos WHERE recipe_id = ? ORDER BY sort_order`,
        args: [recipe.id],
      })
    ).rows;
    const uploads = photos.filter((p) => p.source !== "generated");
    const generated = photos.filter((p) => p.source === "generated");
    if (uploads.length === 0) continue;

    let targets = [];
    if (ALL_PHOTOS) {
      targets = uploads;
    } else {
      const cover = uploads.find((p) => p.blob_url === recipe.image_url) ?? uploads[0];
      targets = [cover];
    }
    for (const target of targets) {
      const already = generated.some((g) => g.source_photo_id === target.id);
      if (!already) work.push({ recipe, photo: target });
    }
  }

  console.log(`user ${USER_ID}: ${work.length} photo(s) to paint${ALL_PHOTOS ? " (all photos)" : " (covers)"}${DRY_RUN ? " — DRY RUN" : ""}`);
  for (const item of work) {
    console.log(`  #${item.recipe.id} ${String(item.recipe.title).slice(0, 44)}  photo ${item.photo.id}`);
  }
  if (DRY_RUN || work.length === 0) return;

  let done = 0;
  for (const item of work) {
    const label = `#${item.recipe.id} ${item.recipe.title} (photo ${item.photo.id})`;
    try {
      const res = await fetch(item.photo.blob_url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`fetch original failed (${res.status})`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const mimeType = res.headers.get("content-type") || "image/jpeg";

      const png = await beautify(bytes, mimeType);
      const blob = await put(
        `recipes/${item.recipe.id}/photos/generated-${item.photo.id}-${Date.now()}.png`,
        new Blob([png.buffer], { type: "image/png" }),
        { access: "public", contentType: "image/png" }
      );
      const maxSort = Math.max(
        0,
        ...(await db.execute({ sql: "SELECT max(sort_order) m FROM recipe_photos WHERE recipe_id = ?", args: [item.recipe.id] })).rows.map((r) => r.m ?? 0)
      );
      await db.execute({
        sql: `INSERT INTO recipe_photos (recipe_id, blob_url, source, source_photo_id, sort_order, created_at)
              VALUES (?, ?, 'generated', ?, ?, ?)`,
        args: [item.recipe.id, blob.url, item.photo.id, maxSort + 1, new Date().toISOString()],
      });
      done++;
      console.log(`PAINTED ${label}`);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      if (err?.status === 429) {
        console.error(`RATE LIMITED after ${done} photo(s). Re-run later — already-painted photos are skipped.`);
        process.exit(1);
      }
      console.error(`FAILED ${label}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`done: ${done}/${work.length} painted`);
}

main().catch((err) => {
  console.error("batch failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
