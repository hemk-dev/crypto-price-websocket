export type PriceUpdate = {
  symbol: string;
  lastPrice: string;
  changePercent24h: string;
  timestamp: number;
};

export type Broadcast = (payload: string) => void;
