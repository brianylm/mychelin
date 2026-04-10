export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  return new Response(
    JSON.stringify({ ok: true, runtime: "edge", receivedBytes: body.length }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, runtime: "edge", method: "GET" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
