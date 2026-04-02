import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { Broadcast } from "../types";

const clients = new Set<WebSocket>();

function initializeWebSocketServer(httpServer: Server) {
    const wss = new WebSocketServer({
        server: httpServer,
        path: "/ws",
        verifyClient: () => {
            return clients.size < parseInt(process.env.WS_MAX_CONNECTIONS || "50", 10);
        },
    });

    wss.on("connection", (ws) => {
        console.log("Client connected");
        clients.add(ws);

        ws.on("close", () => {
            console.log("Client disconnected");
            clients.delete(ws);
        });

        ws.on("error", (error) => {
            console.error("Client error:", error);
        });

    });
}

const broadcast: Broadcast = (data: string) => {
    clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

export { initializeWebSocketServer, broadcast };