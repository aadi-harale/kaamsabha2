export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, service: "kaamsabha2", runtime: "vercel-node", timestamp: new Date().toISOString() });
}
