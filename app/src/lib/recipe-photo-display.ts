// Photo selection helpers for recipe display and sharing.
// Photos come in two sources: "upload" (user-added) and "generated"
// (AI-beautified variant of an upload, linked via sourcePhotoId).

export interface PhotoLike {
  id: number;
  blobUrl: string;
  source?: string | null;
  sourcePhotoId?: number | null;
  sortOrder?: number | null;
}

function isGenerated(photo: PhotoLike): boolean {
  return photo.source === "generated";
}

function bySortOrder(a: PhotoLike, b: PhotoLike): number {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
}

// The canonical cover: the upload whose URL matches recipes.imageUrl,
// else the first upload by sort order. Generated rows are never picked
// as the cover source — they're display variants, not originals.
export function coverPhoto(photos: PhotoLike[], imageUrl: string | null | undefined): PhotoLike | null {
  const uploads = photos.filter((p) => !isGenerated(p)).sort(bySortOrder);
  if (uploads.length === 0) return null;
  if (imageUrl) {
    const match = uploads.find((p) => p.blobUrl === imageUrl);
    if (match) return match;
  }
  return uploads[0];
}

// The AI-beautified variant of a given source photo, if one exists.
export function generatedVariantOf(photos: PhotoLike[], photoId: number): PhotoLike | null {
  return (
    photos
      .filter((p) => isGenerated(p) && p.sourcePhotoId === photoId)
      .sort(bySortOrder)[0] ?? null
  );
}

// What to show as the hero: the generated variant of the cover photo
// when available, else the cover photo itself, else null.
export function heroPhoto(photos: PhotoLike[], imageUrl: string | null | undefined): PhotoLike | null {
  const cover = coverPhoto(photos, imageUrl);
  if (!cover) return null;
  return generatedVariantOf(photos, cover.id) ?? cover;
}
