"use client";

import { useState, useRef, useCallback } from "react";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
}

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const JPEG_QUALITY = 0.75;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ currentImageUrl, onImageUploaded, onImageRemoved }: ImageUploadProps) {
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be under 5MB.");
      return;
    }

    setProcessing(true);
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
      onImageUploaded(dataUrl);
    } catch {
      setError("Failed to process image. Please try again.");
      setPreview(currentImageUrl || null);
    } finally {
      setProcessing(false);
    }
  }, [currentImageUrl, onImageUploaded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const removeImage = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImageRemoved?.();
  };

  return (
    <div>
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-stone-200">
          <img
            src={preview}
            alt="Recipe"
            className="w-full h-48 object-cover"
          />
          {processing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-white text-lg font-semibold animate-pulse">Processing...</div>
            </div>
          )}
          {!processing && (
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
            dragOver
              ? "border-terracotta bg-terracotta-50"
              : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
          }`}
        >
          <p className="text-stone-600 font-medium">
            {processing ? "Processing..." : "Click or drag to add a photo"}
          </p>
          <p className="text-stone-400 text-sm mt-2">JPEG, PNG, WebP, GIF · Max 5MB</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
