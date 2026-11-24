// Deletes the Vercel Blob files (photos, generated photos, voice clips,
// cover and step images) that belong to recipes being deleted.
//
// Two steps, because the files must be found BEFORE the rows go and deleted
// AFTER them (so a blob failure never leaves a recipe that cannot be
// deleted):
//   const urls = await collectRecipeBlobUrls(ids);
//   ...delete the recipe rows...
//   await deleteRecipeBlobs(urls);
//
// Forks and saved share copies reuse the source recipe's image URLs, so a
// file that any remaining row still points at is kept. Blob errors are
// logged, never thrown.
import { del } from "@vercel/blob";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  instructions,
  recipePhotos,
  recipes,
  recipeVersions,
  voiceRecordings,
} from "@/db/schema";

const ID_CHUNK = 200;
const DEL_BATCH = 100;

export function isVercelBlobUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function versionPhotoUrls(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (item && typeof item === "object") {
        const obj = item as { url?: unknown; blobUrl?: unknown };
        const value = obj.url ?? obj.blobUrl;
        return typeof value === "string" ? [value] : [];
      }
      return [];
    });
  } catch {
    return [];
  }
}

/** Every Vercel Blob URL the given recipes point at (deduplicated). */
export async function collectRecipeBlobUrls(recipeIds: number[]): Promise<string[]> {
  const urls = new Set<string>();
  for (const ids of chunk([...new Set(recipeIds)], ID_CHUNK)) {
    const [photoRows, voiceRows, recipeRows, stepRows, versionRows] = await Promise.all([
      db.select({ url: recipePhotos.blobUrl }).from(recipePhotos).where(inArray(recipePhotos.recipeId, ids)),
      db.select({ url: voiceRecordings.blobUrl }).from(voiceRecordings).where(inArray(voiceRecordings.recipeId, ids)),
      db.select({ url: recipes.imageUrl }).from(recipes).where(inArray(recipes.id, ids)),
      db.select({ url: instructions.imageUrl }).from(instructions).where(inArray(instructions.recipeId, ids)),
      db.select({ photos: recipeVersions.photos }).from(recipeVersions).where(inArray(recipeVersions.recipeId, ids)),
    ]);
    for (const row of [...photoRows, ...voiceRows, ...recipeRows, ...stepRows]) {
      if (isVercelBlobUrl(row.url)) urls.add(row.url);
    }
    for (const row of versionRows) {
      for (const url of versionPhotoUrls(row.photos)) if (isVercelBlobUrl(url)) urls.add(url);
    }
  }
  return [...urls];
}

async function stillReferenced(urls: string[]): Promise<Set<string>> {
  const used = new Set<string>();
  for (const part of chunk(urls, ID_CHUNK)) {
    const [photoRows, voiceRows, recipeRows, stepRows] = await Promise.all([
      db.select({ url: recipePhotos.blobUrl }).from(recipePhotos).where(inArray(recipePhotos.blobUrl, part)),
      db.select({ url: voiceRecordings.blobUrl }).from(voiceRecordings).where(inArray(voiceRecordings.blobUrl, part)),
      db.select({ url: recipes.imageUrl }).from(recipes).where(inArray(recipes.imageUrl, part)),
      db.select({ url: instructions.imageUrl }).from(instructions).where(inArray(instructions.imageUrl, part)),
    ]);
    for (const row of [...photoRows, ...voiceRows, ...recipeRows, ...stepRows]) {
      if (row.url) used.add(row.url);
    }
  }
  return used;
}

export interface BlobCleanupResult {
  requested: number;
  deleted: number;
  keptShared: number;
  failed: number;
}

/**
 * Deletes blob files after their recipe rows are gone. Skips any URL another
 * remaining row still uses. Never throws.
 */
export async function deleteRecipeBlobs(urls: string[]): Promise<BlobCleanupResult> {
  const unique = [...new Set(urls.filter(isVercelBlobUrl))];
  const result: BlobCleanupResult = { requested: unique.length, deleted: 0, keptShared: 0, failed: 0 };
  if (unique.length === 0) return result;

  let toDelete = unique;
  try {
    const used = await stillReferenced(unique);
    toDelete = unique.filter((url) => !used.has(url));
    result.keptShared = unique.length - toDelete.length;
  } catch (error) {
    // Without the check we cannot tell a shared file from a private one.
    console.error("blob cleanup: reference check failed; nothing deleted", error instanceof Error ? error.message : error);
    result.failed = unique.length;
    return result;
  }

  for (const batch of chunk(toDelete, DEL_BATCH)) {
    try {
      await del(batch);
      result.deleted += batch.length;
    } catch (error) {
      result.failed += batch.length;
      console.error("blob cleanup: del failed", { count: batch.length, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}
