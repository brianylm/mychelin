"use client";

import { useState, useRef, useCallback } from "react";
import { IconButton } from "@radix-ui/themes";
import {
  Cross2Icon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

export interface RecipePhoto {
  id: string;
  url: string;
  sortOrder: number;
}

interface PhotoUploadSectionProps {
  photos: RecipePhoto[];
  onUpload: (file: File) => Promise<void>;
  onRemove: (photoId: string) => Promise<void>;
  isUploading?: boolean;
  uploadError?: string | null;
}

const MAX_PHOTOS = 10;

export function PhotoUploadSection({
  photos,
  onUpload,
  onRemove,
  isUploading = false,
  uploadError,
}: PhotoUploadSectionProps) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAddMore = photos.length < MAX_PHOTOS;

  const openGallery = useCallback((index: number) => {
    setGalleryIndex(index);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setGalleryIndex((i) =>
      i !== null ? (i < photos.length - 1 ? i + 1 : 0) : null
    );
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setGalleryIndex((i) =>
      i !== null ? (i > 0 ? i - 1 : photos.length - 1) : null
    );
  }, [photos.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") closeGallery();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    },
    [closeGallery, goPrev, goNext]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await onUpload(file);
      }
      e.target.value = "";
    },
    [onUpload]
  );

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-neutral-800">Photos</h3>
            <p className="truncate text-xs text-neutral-500">
              {photos.length}/{MAX_PHOTOS}
            </p>
          </div>

          {/* Thumbnail strip */}
          <div className="flex max-w-[calc(100%-120px)] items-center gap-2 overflow-x-auto py-1">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => openGallery(index)}
                className="flex-shrink-0 h-20 w-20 overflow-hidden rounded-lg border-2 border-neutral-200 transition-colors hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <img
                  src={photo.url}
                  alt={`Recipe photo ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}

            {/* Upload button */}
            {canAddMore && (
              <label className="flex h-20 w-20 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 transition-colors hover:border-amber-400 hover:bg-amber-50">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    <span className="text-[10px] text-neutral-500">...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <PlusIcon className="h-5 w-5 text-neutral-400" />
                    <span className="text-[10px] text-neutral-500">Add</span>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
        </div>

        {uploadError && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {uploadError}
          </p>
        )}
      </section>

      {/* Gallery modal */}
      {galleryIndex !== null && photos[galleryIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={closeGallery}
          />

          {/* Nav arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-4 z-20 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 md:flex"
              >
                <ChevronLeftIcon className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 z-20 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 md:flex"
              >
                <ChevronRightIcon className="h-6 w-6 text-white" />
              </button>
            </>
          )}

          {/* Close + delete */}
          <div className="absolute right-4 top-4 z-20 flex gap-2">
            <IconButton
              size="2"
              variant="soft"
              color="red"
              onClick={() => {
                onRemove(photos[galleryIndex].id);
                if (photos.length <= 1) closeGallery();
                else if (galleryIndex >= photos.length - 1)
                  setGalleryIndex(galleryIndex - 1);
              }}
            >
              <Cross2Icon className="h-4 w-4" />
            </IconButton>
            <button
              onClick={closeGallery}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <Cross2Icon className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Counter */}
          {photos.length > 1 && (
            <div className="absolute left-4 top-4 z-20 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              {galleryIndex + 1} / {photos.length}
            </div>
          )}

          {/* Image */}
          <img
            src={photos[galleryIndex].url}
            alt={`Recipe photo ${galleryIndex + 1}`}
            className="relative z-10 max-h-full max-w-full object-contain"
          />

          {/* Dots */}
          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setGalleryIndex(idx)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    idx === galleryIndex
                      ? "bg-white"
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
