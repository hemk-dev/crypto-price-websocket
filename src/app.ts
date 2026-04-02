import "dotenv/config";
import express, { Request, Response } from "express";
import path from "node:path";
import priceRoutes from "./routes/price.routes";
import { broadcast, initializeWebSocketServer } from "./services/websocketService";
import { startBinanceTicker } from "./services/binanceService";
import { startQueueProcessor } from "./services/queueService";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/price", priceRoutes);

initializeWebSocketServer();
startBinanceTicker();
startQueueProcessor(broadcast);


app.get("/", (req: Request, res: Response, next) => {
  res.sendFile(path.join(__dirname, "../public/index.html"), (err) => {
    if (err) next(err);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
