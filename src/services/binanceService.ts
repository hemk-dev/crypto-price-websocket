import { WebSocket } from "ws";
import type { PriceUpdate } from "../types";
import { upsertPrice } from "../storage/priceStore";
import { enqueue } from "./queueService";

function startBinanceTicker() {
    const ws = new WebSocket(process.env.BINANCE_TICKER_STREAM || "");

    if (!ws) {
        console.error("Failed to connect to Binance service");
        return;
    }

    ws.on("message", (data: string) => {
        const parsed = JSON.parse(data);
        const ticker = parsed.data;

        const payload: PriceUpdate = {
            symbol: ticker.s,
            lastPrice: ticker.c,
            changePercent24h: ticker.P,
            timestamp: Date.now(),
        };
        upsertPrice(payload);
        enqueue(payload)
    })

    ws.on("open", () => {
        console.log("Connected to Binance service");
    })

    ws.on("error", (error) => {
        console.error("Binance service error:", error);
        ws.close();
    })

    ws.on("close", () => {
        console.log("Binance service connection closed");
    })
}

export { startBinanceTicker };