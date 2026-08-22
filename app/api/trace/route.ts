import { traceServer } from "@/lib/trace";

// Sink for client-side trace beacons -- see lib/trace.ts. Temporary.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { event, detail } = await request.json();
    traceServer(`(from client) ${event}`, detail ?? {});
  } catch {
    traceServer("(from client) unparseable-beacon");
  }
  return new Response(null, { status: 204 });
}
