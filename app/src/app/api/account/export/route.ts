import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildAccountExport } from "@/lib/account-export";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// ─── GET /api/account/export ───────────────────────────────
// "Download my data": the signed-in user's own data as a JSON attachment.
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const now = new Date();
    const data = await buildAccountExport(currentUser.id, now);
    const day = now.toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mychelin-export-${day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/account/export error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not build your export. Please try again." }, { status: 500 });
  }
}
