import "dotenv/config";
import express, { Request, Response } from "express";
import http from "node:http";
import path from "node:path";
import { configureCors } from "./middleware/cors.middleware";
import priceRoutes from "./routes/price.routes";
import { broadcast, initializeWebSocketServer } from "./services/websocketService";
import { startBinanceTicker } from "./services/binanceService";
import { startQueueProcessor } from "./services/queueService";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

configureCors(app);

app.use(express.json());

app.use("/api/price", priceRoutes);

app.get("/", (req: Request, res: Response, next) => {
  res.sendFile(path.join(__dirname, "../public/index.html"), (err) => {
    if (err) next(err);
  });
});

const httpServer = http.createServer(app);

initializeWebSocketServer(httpServer);
startBinanceTicker();
startQueueProcessor(broadcast);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket at ws://localhost:${PORT}/ws`);
});
