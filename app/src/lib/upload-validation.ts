/**
 * Upload validation: allowlisted types verified by magic bytes, size caps.
 * Callers must use the returned mime/ext (never the client's name or type).
 *
 * Note: Vercel's request body limit (~4.5 MB) currently caps uploads lower
 * than these limits; the caps are the app-level ceiling.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export type UploadKind = "image" | "audio";

export type UploadValidation =
  | { ok: true; mime: string; ext: string }
  | { ok: false; status: 400 | 413; error: string };

export const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const AUDIO_MIMES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/aac",
  "audio/x-m4a",
  "audio/wav",
] as const;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/aac": "aac",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
};

const ascii = (b: Uint8Array, start: number, text: string) =>
  b.length >= start + text.length &&
  [...text].every((c, i) => b[start + i] === c.charCodeAt(0));

const startsWith = (b: Uint8Array, sig: number[]) =>
  b.length >= sig.length && sig.every((v, i) => b[i] === v);

/** Detect the real type from leading bytes within an allowlisted kind. */
export function detectMime(bytes: Uint8Array, kind: UploadKind): string | null {
  if (kind === "image") {
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
    if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "image/webp";
    if (ascii(bytes, 4, "ftyp")) {
      const brand = String.fromCharCode(...bytes.slice(8, 12));
      if (["heic", "heix", "hevc", "hevx"].includes(brand)) return "image/heic";
      if (["mif1", "msf1", "heim", "heis"].includes(brand)) return "image/heif";
    }
    return null;
  }
  if (ascii(bytes, 4, "ftyp")) {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    return brand === "M4A " ? "audio/x-m4a" : "audio/mp4";
  }
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return "audio/webm";
  if (ascii(bytes, 0, "OggS")) return "audio/ogg";
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WAVE")) return "audio/wav";
  if (ascii(bytes, 0, "ID3")) return "audio/mpeg";
  if (bytes.length >= 2 && bytes[0] === 0xff) {
    if (bytes[1] === 0xf1 || bytes[1] === 0xf9) return "audio/aac";
    if ((bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";
  }
  return null;
}

const normalize = (t: string) => t.split(";")[0].trim().toLowerCase();

/** Declared types that are acceptable aliases for a detected type. */
function compatible(declared: string, detected: string): boolean {
  if (declared === detected) return true;
  const groups = [
    ["audio/mp4", "audio/x-m4a", "audio/m4a", "video/mp4"],
    ["audio/webm", "video/webm"],
    ["audio/ogg", "video/ogg", "application/ogg"],
    ["audio/mpeg", "audio/mp3"],
    ["audio/wav", "audio/x-wav", "audio/wave"],
    ["audio/aac", "audio/x-aac"],
    ["image/heic", "image/heif"],
    ["image/jpeg", "image/jpg"],
  ];
  return groups.some((g) => g.includes(declared) && g.includes(detected));
}

export async function validateUpload(
  file: Blob,
  kind: UploadKind
): Promise<UploadValidation> {
  const label = kind === "image" ? "photo" : "recording";
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  const types = kind === "image" ? "JPEG, PNG, WebP or HEIC" : "WebM, OGG, MP4/M4A, MP3, AAC or WAV";

  if (!file || file.size === 0) {
    return { ok: false, status: 400, error: `The ${label} is empty.` };
  }
  if (file.size > max) {
    return {
      ok: false,
      status: 413,
      error: `The ${label} is too large (max ${Math.round(max / 1024 / 1024)} MB).`,
    };
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detected = detectMime(head, kind);
  if (!detected) {
    return {
      ok: false,
      status: 400,
      error: `Unsupported ${label} format. Use ${types}.`,
    };
  }

  const declared = normalize(file.type || "");
  if (declared && declared !== "application/octet-stream" && !compatible(declared, detected)) {
    return {
      ok: false,
      status: 400,
      error: `The ${label} content does not match its declared type.`,
    };
  }

  return { ok: true, mime: detected, ext: EXT[detected] };
}
