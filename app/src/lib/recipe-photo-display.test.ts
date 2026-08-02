import { describe, it, expect } from "vitest";
import { coverPhoto, generatedVariantOf, heroPhoto, type PhotoLike } from "./recipe-photo-display";

const upload = (id: number, sortOrder = 0): PhotoLike => ({
  id,
  blobUrl: `https://blob.example/upload-${id}.jpg`,
  source: "upload",
  sortOrder,
});

const generated = (id: number, sourcePhotoId: number, sortOrder = 9): PhotoLike => ({
  id,
  blobUrl: `https://blob.example/generated-${id}.png`,
  source: "generated",
  sourcePhotoId,
  sortOrder,
});

describe("coverPhoto", () => {
  it("picks the upload matching imageUrl", () => {
    const photos = [upload(1), upload(2), upload(3)];
    expect(coverPhoto(photos, "https://blob.example/upload-2.jpg")?.id).toBe(2);
  });

  it("falls back to the first upload by sort order", () => {
    const photos = [upload(1, 2), upload(2, 0), upload(3, 1)];
    expect(coverPhoto(photos, null)?.id).toBe(2);
    expect(coverPhoto(photos, "https://blob.example/nope.jpg")?.id).toBe(2);
  });

  it("never picks a generated row", () => {
    const photos = [generated(10, 1, 0), upload(1, 1)];
    expect(coverPhoto(photos, "https://blob.example/generated-10.png")?.id).toBe(1);
  });

  it("returns null when there are no uploads", () => {
    expect(coverPhoto([], null)).toBeNull();
    expect(coverPhoto([generated(10, 1)], null)).toBeNull();
  });
});

describe("generatedVariantOf", () => {
  it("finds the generated row for a source photo", () => {
    const photos = [upload(1), generated(10, 1), generated(11, 2)];
    expect(generatedVariantOf(photos, 1)?.id).toBe(10);
    expect(generatedVariantOf(photos, 2)?.id).toBe(11);
    expect(generatedVariantOf(photos, 3)).toBeNull();
  });
});

describe("heroPhoto", () => {
  it("prefers the generated variant of the cover", () => {
    const photos = [upload(1), generated(10, 1)];
    expect(heroPhoto(photos, null)?.id).toBe(10);
  });

  it("falls back to the cover upload when no variant exists", () => {
    const photos = [upload(1), upload(2)];
    expect(heroPhoto(photos, null)?.id).toBe(1);
  });

  it("returns null with no uploads", () => {
    expect(heroPhoto([], null)).toBeNull();
  });
});
