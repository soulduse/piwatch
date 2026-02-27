type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

const clients: Map<string, SSEClient> = new Map();

export function addClient(
  id: string,
  controller: ReadableStreamDefaultController,
) {
  clients.set(id, { id, controller });
}

export function removeClient(id: string) {
  clients.delete(id);
}

export function broadcast(event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      clients.delete(id);
    }
  }
}
