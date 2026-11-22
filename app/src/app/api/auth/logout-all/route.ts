import { NextRequest, NextResponse } from "next/server";
import { bumpTokenVersion, getCurrentUser, setAuthCookie } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// "Sign out of all devices": bump token_version so every existing cookie is
// rejected, then re-issue one for this device so the person stays signed in.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokenVersion = await bumpTokenVersion(user.id);
    const host = request.headers.get("host") || undefined;
    await setAuthCookie({ ...user, tokenVersion }, host);

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Logout-all error:", err);
    return NextResponse.json(
      { error: "Failed to sign out other devices" },
      { status: 500 }
    );
  }
}
