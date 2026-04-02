import type { PriceUpdate } from "../types";

const livePrices = new Map<string, PriceUpdate>();

export function upsertPrice(data: PriceUpdate): void {
  livePrices.set(data.symbol, data);
}

export function getLatestPrice(symbol: string): PriceUpdate | undefined {
  return livePrices.get(symbol);
}

export function getAllLatestPrices(): PriceUpdate[] {
  return Array.from(livePrices.values());
}

