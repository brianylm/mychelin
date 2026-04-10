export const runtime = "edge";

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      runtime: "edge",
      timestamp: new Date().toISOString(),
      env: {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL || "MISSING",
        TURSO_AUTH_TOKEN_length: process.env.TURSO_AUTH_TOKEN?.length || 0,
        JWT_SECRET_set: !!process.env.JWT_SECRET,
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
