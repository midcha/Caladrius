import { NextRequest } from "next/server";

interface Client {
  controller: ReadableStreamDefaultController<Uint8Array>;
  interval: NodeJS.Timeout;
}

const clients: Record<string, Client[]> = {};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      const sendMessage = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
      };

      // Send initial handshake
      sendMessage("connected");

      // Heartbeat ping
      const interval = setInterval(() => sendMessage("ping"), 15000);

      // Track this client
      if (!clients[sessionId]) clients[sessionId] = [];
      clients[sessionId].push({ controller, interval });
    },

    cancel() {
      // Cleanup on disconnect
      const list = clients[sessionId] || [];
      list.forEach((c) => clearInterval(c.interval));
      clients[sessionId] = list.filter(
        (c) => c.controller.desiredSize !== null
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Helper to notify all clients for a session
export function notifyClients(sessionId: string, message: string) {
  const list = clients[sessionId] || [];
  const encoder = new TextEncoder();
  const payload = encoder.encode(`data: ${message}\n\n`);

  list.forEach((client) => {
    try {
      client.controller.enqueue(payload);
    } catch {
      // If controller is closed, skip
    }
  });
}
