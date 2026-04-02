import type { Broadcast, PriceUpdate } from "../types";
import { getAllLatestPrices } from "../storage/priceStore";

const queue: PriceUpdate[] = [];

function enqueue(data: PriceUpdate) {
  queue.push(data);
}

function startQueueProcessor(broadcast: Broadcast) {
  setInterval(() => {
    if (queue.length === 0) return;
    queue.length = 0;
    broadcast(JSON.stringify(getAllLatestPrices()));
  }, 100);
}

export { enqueue, startQueueProcessor }