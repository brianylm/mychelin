import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEmailVerified } from "@/lib/email-verification";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  // Read separately so a failure here never signs anyone out.
  const emailVerified = await getEmailVerified(user.id);
  return NextResponse.json({
    user: emailVerified === undefined ? user : { ...user, emailVerified },
  });
}
