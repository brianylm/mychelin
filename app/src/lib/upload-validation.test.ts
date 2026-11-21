import { describe, expect, it } from "vitest";
import { validateUpload, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES } from "./upload-validation";

const mk = (bytes: number[] | string, type = "", pad = 32) => {
  const arr =
    typeof bytes === "string"
      ? [...bytes].map((c) => c.charCodeAt(0))
      : bytes;
  const u = new Uint8Array(Math.max(pad, arr.length));
  u.set(arr);
  return new Blob([u], { type });
};
const asc = (s: string) => [...s].map((c) => c.charCodeAt(0));
const ftyp = (brand: string) => [0, 0, 0, 24, ...asc("ftyp"), ...asc(brand)];
const riff = (kind: string) => [...asc("RIFF"), 0, 0, 0, 0, ...asc(kind)];

describe("validateUpload images", () => {
  it.each([
    ["jpeg", [0xff, 0xd8, 0xff, 0xe0], "image/jpeg", "jpg"],
    ["png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a], "image/png", "png"],
    ["webp", riff("WEBP"), "image/webp", "webp"],
    ["heic", ftyp("heic"), "image/heic", "heic"],
    ["heif", ftyp("mif1"), "image/heif", "heif"],
  ])("accepts %s", async (_n, bytes, mime, ext) => {
    expect(await validateUpload(mk(bytes, mime), "image")).toEqual({ ok: true, mime, ext });
  });

  it("accepts empty declared type", async () => {
    const r = await validateUpload(mk([0xff, 0xd8, 0xff]), "image");
    expect(r.ok).toBe(true);
  });

  it("rejects mismatched declared type", async () => {
    const r = await validateUpload(mk([0xff, 0xd8, 0xff], "image/png"), "image");
    expect(r.ok).toBe(false);
  });

  it("rejects SVG and HTML even when declared as images", async () => {
    expect((await validateUpload(mk("<svg xmlns=", "image/svg+xml"), "image")).ok).toBe(false);
    expect((await validateUpload(mk("<html><script>", "image/png"), "image")).ok).toBe(false);
  });

  it("rejects GIF", async () => {
    expect((await validateUpload(mk("GIF89a", "image/gif"), "image")).ok).toBe(false);
  });

  it("rejects empty and oversize", async () => {
    expect(await validateUpload(new Blob([]), "image")).toMatchObject({ ok: false, status: 400 });
    const big = new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: "image/jpeg" });
    expect(await validateUpload(big, "image")).toMatchObject({ ok: false, status: 413 });
  });
});

describe("validateUpload audio", () => {
  it.each([
    ["webm", [0x1a, 0x45, 0xdf, 0xa3], "audio/webm;codecs=opus", "audio/webm", "webm"],
    ["ogg", asc("OggS"), "audio/ogg", "audio/ogg", "ogg"],
    ["mp4", ftyp("isom"), "audio/mp4", "audio/mp4", "m4a"],
    ["m4a", ftyp("M4A "), "audio/x-m4a", "audio/x-m4a", "m4a"],
    ["mp3 id3", asc("ID3"), "audio/mpeg", "audio/mpeg", "mp3"],
    ["mp3 sync", [0xff, 0xfb, 0x90], "audio/mpeg", "audio/mpeg", "mp3"],
    ["aac", [0xff, 0xf1, 0x50], "audio/aac", "audio/aac", "aac"],
    ["wav", riff("WAVE"), "audio/wav", "audio/wav", "wav"],
  ])("accepts %s", async (_n, bytes, declared, mime, ext) => {
    expect(await validateUpload(mk(bytes, declared), "audio")).toEqual({ ok: true, mime, ext });
  });

  it("rejects image bytes as audio and HTML", async () => {
    expect((await validateUpload(mk([0xff, 0xd8, 0xff], "audio/webm"), "audio")).ok).toBe(false);
    expect((await validateUpload(mk("<html>", "audio/webm"), "audio")).ok).toBe(false);
  });

  it("rejects mismatched declared type", async () => {
    expect((await validateUpload(mk(asc("OggS"), "audio/wav"), "audio")).ok).toBe(false);
  });

  it("rejects empty and oversize", async () => {
    expect((await validateUpload(new Blob([]), "audio")).ok).toBe(false);
    const big = new Blob([new Uint8Array(MAX_AUDIO_BYTES + 1)], { type: "audio/webm" });
    expect(await validateUpload(big, "audio")).toMatchObject({ ok: false, status: 413 });
  });
});
