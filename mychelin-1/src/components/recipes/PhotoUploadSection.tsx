"use client";

import { useState, useRef, useCallback } from "react";
import { IconButton } from "@radix-ui/themes";
import {
  Cross2Icon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  RotateCounterClockwiseIcon,
} from "@radix-ui/react-icons";

export interface RecipePhoto {
  id: string;
  url: string;
  sortOrder: number;
}

interface PhotoUploadSectionProps {
  photos: RecipePhoto[];
  coverUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: (photoId: string) => Promise<void>;
  onSetCover?: (photoUrl: string) => Promise<void>;
  isUploading?: boolean;
  uploadError?: string | null;
}

const MAX_PHOTOS = 10;

export function PhotoUploadSection({
  photos,
  coverUrl,
  onUpload,
  onRemove,
  onSetCover,
  isUploading = false,
  uploadError,
}: PhotoUploadSectionProps) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const canAddMore = photos.length < MAX_PHOTOS;

  const openGallery = useCallback((index: number) => {
    setGalleryIndex(index);
    setRotation(0);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryIndex(null);
    setRotation(0);
  }, []);

  const goNext = useCallback(() => {
    setGalleryIndex((i) =>
      i !== null ? (i < photos.length - 1 ? i + 1 : 0) : null
    );
    setRotation(0);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setGalleryIndex((i) =>
      i !== null ? (i > 0 ? i - 1 : photos.length - 1) : null
    );
    setRotation(0);
  }, [photos.length]);

  const rotatePhoto = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

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
      const files = e.target.files;
      if (!files || files.length === 0) return;
      // Upload each selected file sequentially so the server isn't
      // hammered and the UI shows progress accurately.
      for (let i = 0; i < files.length; i++) {
        await onUpload(files[i]);
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
                className={`relative flex-shrink-0 h-20 w-20 overflow-hidden rounded-lg border-2 transition-colors hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  photo.url === coverUrl ? "border-amber-400" : "border-neutral-200"
                }`}
              >
                <img
                  src={photo.url}
                  alt={`Recipe photo ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {photo.url === coverUrl && (
                  <span className="absolute bottom-0.5 right-0.5 text-[10px]">⭐</span>
                )}
              </button>
            ))}

            {/* Camera button (mobile) */}
            {canAddMore && (
              <label className="flex h-20 w-20 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 transition-colors hover:border-amber-400 hover:bg-amber-50 md:hidden">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    <span className="text-[10px] text-neutral-500">...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                      <circle cx="12" cy="13" r="3"/>
                    </svg>
                    <span className="text-[10px] text-neutral-500">Camera</span>
                  </div>
                )}
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
            )}

            {/* Gallery / file upload button */}
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
                    <span className="text-[10px] text-neutral-500">Gallery</span>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
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

          {/* Toolbar */}
          <div className="absolute right-4 top-4 z-20 flex gap-2">
            {onSetCover && photos[galleryIndex].url !== coverUrl && (
              <button
                onClick={() => {
                  onSetCover(photos[galleryIndex].url);
                }}
                className="flex h-9 items-center gap-1.5 rounded-full bg-black/40 px-3 text-xs font-medium text-white transition-colors hover:bg-black/60"
                title="Set as cover"
              >
                ⭐ Cover
              </button>
            )}
            <button
              onClick={rotatePhoto}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/60"
              title="Rotate"
            >
              <RotateCounterClockwiseIcon className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={() => {
                if (!confirm("Remove this photo?")) return;
                onRemove(photos[galleryIndex].id);
                if (photos.length <= 1) closeGallery();
                else if (galleryIndex >= photos.length - 1)
                  setGalleryIndex(galleryIndex - 1);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/80 transition-colors hover:bg-red-500"
              title="Delete photo"
            >
              <TrashIcon className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={closeGallery}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/60"
              title="Close"
            >
              <Cross2Icon className="h-4 w-4 text-white" />
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
            className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
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
