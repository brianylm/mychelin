import { createHash } from "node:crypto";
import type { NextConfig } from "next";
import { COMFORT_BOOT_SCRIPT } from "./src/lib/comfort-mode";

const bootScriptHash = createHash("sha256").update(COMFORT_BOOT_SCRIPT).digest("base64");

// Report-Only for now: browsers log violations, nothing is blocked.
// Next's inline runtime scripts need 'unsafe-inline' until nonces are added via
// middleware; switch to enforcing (Content-Security-Policy) only after that.
export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'sha256-${bootScriptHash}'`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "media-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' blob: https://*.public.blob.vercel-storage.com https://vercel.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
].join("; ");

export const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(self), geolocation=(), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  // Lets /_next/image resize recipe photos for link previews.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/recipes", destination: "/app/recipes", permanent: true },
      { source: "/recipes/:path*", destination: "/app/recipes/:path*", permanent: true },
      { source: "/fridge", destination: "/app/fridge", permanent: true },
      { source: "/planner", destination: "/app/planner", permanent: true },
      { source: "/profile", destination: "/app/profile", permanent: true },
      { source: "/capture", destination: "/app/capture", permanent: true },
      { source: "/discover", destination: "/app/discover", permanent: true },
    ];
  },
};

export default nextConfig;
