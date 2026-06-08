import { NextResponse } from "next/server";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function GET() {
  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "").trim();
  return NextResponse.json({ configured: Boolean(publicKey), publicKey: publicKey || null });
}
