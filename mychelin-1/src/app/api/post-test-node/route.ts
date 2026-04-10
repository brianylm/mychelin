export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  return new Response(
    JSON.stringify({ ok: true, runtime: "nodejs", receivedBytes: body.length }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, runtime: "nodejs", method: "GET" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
