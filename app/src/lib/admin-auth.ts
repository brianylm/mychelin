import { NextResponse } from "next/server";
import { getCurrentUser, type AuthUser } from "@/lib/auth";

export function adminEmails(): Set<string> {
  const raw = process.env.ANALYTICS_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().has(email.trim().toLowerCase());
}

export async function requireAdminUser(): Promise<
  | { user: AuthUser; response?: never }
  | { user?: never; response: NextResponse }
> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isAdminEmail(currentUser.email)) {
    return {
      response: NextResponse.json(
        { error: "Forbidden", detail: "Add this email to ANALYTICS_ADMIN_EMAILS or ADMIN_EMAILS." },
        { status: 403 }
      ),
    };
  }
  return { user: currentUser };
}
