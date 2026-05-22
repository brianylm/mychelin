import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST(request: NextRequest) {
  const host = request.headers.get("host") || undefined;
  await clearAuthCookie(host);
  return NextResponse.json({ message: "Logged out" });
}
