"use client";

import { useState, useRef, useCallback } from "react";
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
  variant?: "card" | "cover";
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  coverUrl?: string | null;
  onUpload: (file: File, onProgress?: (progress: number | null) => void) => Promise<void>;
  onRemove: (photoId: string) => Promise<void>;
  onSetCover?: (photoUrl: string) => Promise<void>;
  isUploading?: boolean;
  uploadError?: string | null;
  readOnly?: boolean;
}

const MAX_PHOTOS = 10;

type UploadStatus = {
  id: string;
  fileName: string;
  index: number;
  total: number;
  progress: number | null;
};

function PhotoUploadProgress({ status }: { status: UploadStatus }) {
  const progress = status.progress;
  const visibleProgress = progress ?? 38;
  const label = status.total > 1
    ? `Uploading photo ${status.index} of ${status.total}`
    : "Uploading photo";

  return (
    <div className="rounded-xl border border-[#800020]/15 bg-[#800020]/5 px-3 py-2" role="status" aria-live="polite">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold text-[#4a1824]">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 tabular-nums">{progress === null ? "Working" : `${progress}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/90">
        <div
          className={`h-full rounded-full bg-[#800020] transition-[width] duration-200 ${progress === null ? "animate-pulse" : ""}`}
          style={{ width: `${visibleProgress}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress ?? undefined}
          aria-label={label}
        />
      </div>
      <p className="mt-1.5 truncate text-[11px] text-neutral-500">{status.fileName}</p>
    </div>
  );
}

export function PhotoUploadSection({
  photos,
  variant = "card",
  title,
  subtitle,
  actions,
  coverUrl,
  onUpload,
  onRemove,
  onSetCover,
  isUploading = false,
  uploadError,
  readOnly = false,
}: PhotoUploadSectionProps) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const canAddMore = !readOnly && photos.length < MAX_PHOTOS;
  const uploadInProgress = isUploading || uploadStatus !== null;
  const displayedUploadStatus = uploadStatus ?? (isUploading
    ? { id: "external", fileName: "Photo upload", index: 1, total: 1, progress: null }
    : null);

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
      const selectedFiles = Array.from(e.target.files ?? []);
      if (selectedFiles.length === 0) return;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const uploadId = `${Date.now()}-${i}-${file.name}`;
        setUploadStatus({
          id: uploadId,
          fileName: file.name,
          index: i + 1,
          total: selectedFiles.length,
          progress: 0,
        });

        try {
          await onUpload(file, (progress) => {
            setUploadStatus((current) =>
              current?.id === uploadId
                ? {
                    ...current,
                    progress: progress === null
                      ? null
                      : Math.max(0, Math.min(100, Math.round(progress))),
                  }
                : current
            );
          });
          setUploadStatus((current) =>
            current?.id === uploadId ? { ...current, progress: 100 } : current
          );
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        } catch {
          break;
        }
      }

      setUploadStatus(null);
      e.target.value = "";
    },
    [onUpload]
  );

  // Cover image — find from photos list
  const coverPhoto = coverUrl
    ? photos.find((p) => p.url === coverUrl)
    : null;
  const coverIndex = coverUrl
    ? photos.findIndex((photo) => photo.url === coverUrl)
    : -1;
  const galleryStartIndex = coverIndex >= 0 ? coverIndex : 0;

  if (variant === "cover") {
    return (
      <>
        <section className="relative -mx-5 -mt-4 overflow-hidden bg-neutral-100 md:mx-0 md:mt-0 md:rounded-[1.75rem]">
          <div className="relative h-[245px] sm:h-[310px]">
            {coverUrl ? (
              <button
                type="button"
                onClick={() => {
                  if (photos.length > 0) openGallery(galleryStartIndex);
                }}
                className="block h-full w-full cursor-zoom-in"
                aria-label="Open recipe photo gallery"
              >
                <img src={coverUrl} alt="Recipe cover" className="h-full w-full object-cover" />
              </button>
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-[#f4eee7] text-neutral-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5" />

            <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap gap-2">
                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openGallery(galleryStartIndex)}
                    className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white/85 transition hover:bg-black/50"
                  >
                    {photos.length} photo{photos.length === 1 ? "" : "s"}
                  </button>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {actions}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              {title}
              {subtitle}
            </div>
          </div>

          {!readOnly && (
            <div className="bg-white px-4 py-3 md:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 gap-2 overflow-x-auto">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => openGallery(index)}
                    className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors hover:border-[#800020]/45 ${photo.url === coverUrl ? "border-[#800020]/45" : "border-neutral-200"}`}
                  >
                    <img src={photo.url} alt={`Recipe photo ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
                </div>
                {canAddMore && (
                  <label className={`flex min-h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#800020]/20 bg-[#800020]/5 px-3 text-xs font-semibold text-[#800020] transition hover:bg-[#800020]/10 ${uploadInProgress ? "pointer-events-none opacity-60" : ""}`}>
                    {uploadInProgress ? "Uploading" : "Add photos"}
                    <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={uploadInProgress} />
                  </label>
                )}
              </div>
              {displayedUploadStatus && (
                <div className="mt-3">
                  <PhotoUploadProgress status={displayedUploadStatus} />
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{uploadError}</p>
          )}
        </section>

        {galleryIndex !== null && photos[galleryIndex] && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center"
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={closeGallery} />
            {photos.length > 1 && (
              <>
                <button onClick={goPrev} className="absolute left-4 z-20 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 md:flex">
                  <ChevronLeftIcon className="h-6 w-6 text-white" />
                </button>
                <button onClick={goNext} className="absolute right-4 z-20 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 md:flex">
                  <ChevronRightIcon className="h-6 w-6 text-white" />
                </button>
              </>
            )}
            <div className="absolute right-4 top-4 z-20 flex flex-wrap gap-2">
              {!readOnly && onSetCover && photos[galleryIndex].url !== coverUrl && (
                <button onClick={() => onSetCover(photos[galleryIndex].url)} className="flex h-9 items-center gap-1.5 rounded-full bg-[#17131f]/90 px-3 text-xs font-medium text-white transition-colors hover:bg-[#17131f]">
                  Set as cover
                </button>
              )}
              {photos[galleryIndex].url === coverUrl && (
                <span className="flex h-9 items-center gap-1.5 rounded-full bg-[#17131f] px-3 text-xs font-medium text-white">Current cover</span>
              )}
              <button onClick={rotatePhoto} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/60" title="Rotate">
                <RotateCounterClockwiseIcon className="h-4 w-4 text-white" />
              </button>
              {!readOnly && (
                <button
                  onClick={() => {
                    if (!confirm("Remove this photo?")) return;
                    onRemove(photos[galleryIndex].id);
                    if (photos.length <= 1) closeGallery();
                    else if (galleryIndex >= photos.length - 1) setGalleryIndex(galleryIndex - 1);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/80 transition-colors hover:bg-red-500"
                  title="Delete photo"
                >
                  <TrashIcon className="h-4 w-4 text-white" />
                </button>
              )}
              <button onClick={closeGallery} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/60" title="Close">
                <Cross2Icon className="h-4 w-4 text-white" />
              </button>
            </div>
            {photos.length > 1 && (
              <div className="absolute left-4 top-4 z-20 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                {galleryIndex + 1} / {photos.length}
              </div>
            )}
            <img src={photos[galleryIndex].url} alt={`Recipe photo ${galleryIndex + 1}`} className="relative z-10 max-h-[calc(100vh-7rem)] max-w-full object-contain transition-transform duration-200" style={{ transform: `rotate(${rotation}deg)` }} />
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-4 right-4 z-20 overflow-x-auto pb-1">
                <div className="mx-auto flex w-max max-w-full gap-2 rounded-2xl bg-black/45 p-2 backdrop-blur-sm">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => {
                        setGalleryIndex(index);
                        setRotation(0);
                      }}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${index === galleryIndex ? "border-white" : "border-white/20 opacity-70 hover:opacity-100"}`}
                      aria-label={`Open photo ${index + 1}`}
                    >
                      <img src={photo.url} alt={`Recipe thumbnail ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        {/* Cover / hero image */}
        {coverUrl ? (
          <div className="relative group">
            <img
              src={coverUrl}
              alt="Recipe cover"
              className="w-full h-48 sm:h-56 object-cover"
            />
            {/* Overlay controls */}
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/50 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
              <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white">
                Cover photo
              </span>
              <div className="flex gap-1.5">
                {canAddMore && (
                  <label className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-black/40 px-3 text-[11px] font-medium text-white transition hover:bg-black/60 ${uploadInProgress ? "pointer-events-none opacity-60" : ""}`}>
                    Change
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={uploadInProgress}
                    />
                  </label>
                )}
                {coverPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = photos.findIndex(
                        (p) => p.url === coverUrl
                      );
                      if (idx >= 0) openGallery(idx);
                    }}
                    className="flex h-8 items-center gap-1.5 rounded-full bg-black/40 px-3 text-[11px] font-medium text-white transition hover:bg-black/60"
                  >
                    {readOnly ? "View" : "Edit"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : readOnly ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 border-b border-dashed border-neutral-200 bg-neutral-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span className="text-xs font-medium text-neutral-400">No cover photo</span>
          </div>
        ) : (
          <label className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 border-b border-dashed border-neutral-200 bg-neutral-50 transition hover:bg-[#800020]/5 ${uploadInProgress ? "pointer-events-none opacity-60" : ""}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span className="text-xs font-medium text-neutral-400">
              Add cover photo
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploadInProgress}
            />
          </label>
        )}

        {/* Photos strip + add buttons */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-neutral-800">Photos</h3>
              <p className="truncate text-xs text-neutral-500">
                {photos.length}/{MAX_PHOTOS}
              </p>
            </div>

            <div className="flex max-w-[calc(100%-120px)] items-center gap-2 overflow-x-auto py-1">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => openGallery(index)}
                  className={`relative flex-shrink-0 h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors hover:border-[#800020]/45 focus:outline-none focus:ring-2 focus:ring-[#800020]/40 ${
                    photo.url === coverUrl ? "border-[#800020]/45" : "border-neutral-200"
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={`Recipe photo ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {photo.url === coverUrl && (
                    <span className="absolute bottom-0 right-0 rounded-tl bg-[#800020]/50 px-1 py-0.5 text-[8px] font-bold text-white">
                      COVER
                    </span>
                  )}
                </button>
              ))}

              {/* Camera (mobile) */}
              {canAddMore && (
                <label className={`flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 transition-colors hover:border-[#800020]/45 hover:bg-[#800020]/5 md:hidden ${uploadInProgress ? "pointer-events-none opacity-60" : ""}`}>
                  {uploadInProgress ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#800020]/45 border-t-transparent" />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                        <circle cx="12" cy="13" r="3"/>
                      </svg>
                      <span className="text-[9px] text-neutral-500">Camera</span>
                    </div>
                  )}
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploadInProgress}
                  />
                </label>
              )}

              {/* Gallery */}
              {canAddMore && (
                <label className={`flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 transition-colors hover:border-[#800020]/45 hover:bg-[#800020]/5 ${uploadInProgress ? "pointer-events-none opacity-60" : ""}`}>
                  {uploadInProgress ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#800020]/45 border-t-transparent" />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <PlusIcon className="h-4 w-4 text-neutral-400" />
                      <span className="text-[9px] text-neutral-500">Gallery</span>
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploadInProgress}
                  />
                </label>
              )}
            </div>
          </div>

          {displayedUploadStatus && (
            <div className="mt-3">
              <PhotoUploadProgress status={displayedUploadStatus} />
            </div>
          )}

          {uploadError && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {uploadError}
            </p>
          )}
        </div>
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

          {/* Swipe area for mobile */}
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
          <div className="absolute right-4 top-4 z-20 flex flex-wrap gap-2">
            {!readOnly && onSetCover && photos[galleryIndex].url !== coverUrl && (
              <button
                onClick={() => onSetCover(photos[galleryIndex].url)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-[#17131f]/90 px-3 text-xs font-medium text-white transition-colors hover:bg-[#17131f]"
                title="Set as cover"
              >
                Set as cover
              </button>
            )}
            {photos[galleryIndex].url === coverUrl && (
              <span className="flex h-9 items-center gap-1.5 rounded-full bg-[#17131f] px-3 text-xs font-medium text-white">
                Current cover
              </span>
            )}
            <button
              onClick={rotatePhoto}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/60"
              title="Rotate"
            >
              <RotateCounterClockwiseIcon className="h-4 w-4 text-white" />
            </button>
            {!readOnly && (
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
            )}
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
