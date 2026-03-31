import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export const preferredRegion = "hnd1";

export async function POST() {
  await clearAuthCookie();
  return NextResponse.json({ message: "Logged out" });
}
