import { addClient, removeClient } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      addClient(clientId, controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`),
      );
    },
    cancel() {
      removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
