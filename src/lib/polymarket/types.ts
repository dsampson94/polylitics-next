/**
 * Polymarket API Types
 * Type definitions for Polymarket API responses and internal data structures
 */

export type ApiMarket = {
  id: string;
  conditionId?: string | null;
  slug?: string | null;
  title: string;
  description?: string | null;
  rules?: string | null;
  category?: string | null;
  endDate?: string | null;
  active?: boolean | null;
  closed?: boolean | null;
  outcome?: string | null;
  resolvedAt?: string | null;
};

export type ApiMarketPrice = {
  marketId: string;
  yesPrice?: number | null;
  noPrice?: number | null;
  liquidity?: number | null;
  volume24h?: number | null;
};

export type ApiOrderBook = {
  marketId: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
};

export type MarketWithSnapshot = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  endDate?: Date | null;
  active: boolean;
  isByDate: boolean;
  snapshots: Array<{
    capturedAt: Date;
    yesPrice?: number | null;
    noPrice?: number | null;
    volume24h?: number | null;
    liquidity?: number | null;
    priceChange1h?: number | null;
    priceChange24h?: number | null;
  }>;
};

export type ScoredMarket = {
  id: string;
  title: string;
  marketProb: number;
  modelProb: number;
  edge: number;
  delayRisk: number;
  timeRemainingDays?: number | null;
  rationale: string[];
  snapshot?: {
    yesPrice?: number | null;
    volume24h?: number | null;
    liquidity?: number | null;
  };
};

export type MovingMarket = {
  id: string;
  title: string;
  currentPrice: number;
  priceChange1h?: number | null;
  priceChange24h?: number | null;
  volumeSpike?: number | null;
  volumeZScore?: number | null;
  attentionScore?: number | null;
  liquidity?: number | null;
};
