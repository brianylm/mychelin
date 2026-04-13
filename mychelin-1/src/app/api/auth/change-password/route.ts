import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  getCurrentUser,
  getUserFromDb,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 }
      );
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Look up the current hash from the DB (the JWT doesn't carry it).
    const user = await getUserFromDb(authUser.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
