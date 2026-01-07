/**
 * Market Scoring
 * Combines models to produce actionable market scores
 */

import { deadlineDelayModel, volumeSpikeScore, priceVelocity, attentionScore } from "./model";
import { looksLikeByDateMarket, timeRemainingDays } from "./deadline";
import type { ScoredMarket, MarketWithSnapshot } from "./types";

/**
 * Score a single market for deadline delay risk
 */
export function scoreDeadlineMarket(market: {
  id: string;
  title: string;
  description?: string | null;
  rules?: string | null;
  category?: string | null;
  endDate?: Date | null;
  yesPrice?: number | null;
  liquidity?: number | null;
}): ScoredMarket | null {
  // Only score "by-date" markets
  if (!looksLikeByDateMarket(market.title, market.rules, market.description)) {
    return null;
  }

  const yesPrice = market.yesPrice;
  if (yesPrice === null || yesPrice === undefined) {
    return null;
  }

  const marketProb = clamp01(yesPrice);
  const modelOutput = deadlineDelayModel({
    marketProb,
    endDate: market.endDate,
    liquidity: market.liquidity,
    category: market.category,
  });

  const edge = modelOutput.modelProb - marketProb;
  const timeRemaining = timeRemainingDays(market.endDate);

  return {
    id: market.id,
    title: market.title,
    marketProb,
    modelProb: modelOutput.modelProb,
    edge,
    delayRisk: modelOutput.delayRisk,
    timeRemainingDays: timeRemaining,
    rationale: modelOutput.rationale,
    snapshot: {
      yesPrice,
      liquidity: market.liquidity,
    },
  };
}

/**
 * Score markets for price/volume momentum
 */
export function scoreMovingMarket(market: {
  id: string;
  title: string;
  snapshots: Array<{
    capturedAt: Date;
    yesPrice?: number | null;
    volume24h?: number | null;
    liquidity?: number | null;
    priceChange1h?: number | null;
    priceChange24h?: number | null;
  }>;
}) {
  if (market.snapshots.length === 0) return null;

  const latest = market.snapshots[0];
  const currentPrice = latest.yesPrice ?? 0;

  // Volume spike detection
  const volumeHistory = market.snapshots
    .slice(1, 20)
    .map(s => s.volume24h ?? 0)
    .filter(v => v > 0);

  const volumeAnalysis = volumeSpikeScore({
    volume24h: latest.volume24h,
    volumeHistory,
  });

  // Price velocity
  const priceHistory = market.snapshots
    .map(s => ({
      price: s.yesPrice ?? 0,
      timestamp: s.capturedAt,
    }))
    .filter(p => p.price > 0);

  const velocity = priceVelocity(priceHistory);

  // Attention score
  const attention = attentionScore({
    volume24h: latest.volume24h,
    priceChange24h: latest.priceChange24h,
    liquidity: latest.liquidity,
  });

  return {
    id: market.id,
    title: market.title,
    currentPrice,
    priceChange1h: latest.priceChange1h,
    priceChange24h: latest.priceChange24h,
    volumeSpike: volumeAnalysis.isSpike ? volumeAnalysis.volumeZScore : null,
    volumeZScore: volumeAnalysis.volumeZScore,
    attentionScore: attention,
    liquidity: latest.liquidity,
    velocity1h: velocity.velocity1h,
    velocity24h: velocity.velocity24h,
    acceleration: velocity.acceleration,
  };
}

/**
 * Rank scored markets by edge magnitude
 */
export function rankByEdge(markets: ScoredMarket[]): ScoredMarket[] {
  return [...markets].sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
}

/**
 * Filter markets by minimum edge threshold
 */
export function filterByEdge(markets: ScoredMarket[], minEdge: number = 0.05): ScoredMarket[] {
  return markets.filter(m => Math.abs(m.edge) >= minEdge);
}

/**
 * Rank moving markets by attention score
 */
export function rankByAttention(markets: ReturnType<typeof scoreMovingMarket>[]): NonNullable<ReturnType<typeof scoreMovingMarket>>[] {
  return markets
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => (b.attentionScore ?? 0) - (a.attentionScore ?? 0));
}

/**
 * Detect opportunities (markets with edge + attention)
 */
export function detectOpportunities(args: {
  deadlineScores: ScoredMarket[];
  movingScores: ReturnType<typeof scoreMovingMarket>[];
  minEdge?: number;
  minAttention?: number;
}) {
  const minEdge = args.minEdge ?? 0.05;
  const minAttention = args.minAttention ?? 0.3;

  const opportunities = [];

  // Deadline opportunities
  for (const scored of args.deadlineScores) {
    const moving = args.movingScores.find(m => m?.id === scored.id);
    if (Math.abs(scored.edge) >= minEdge && (moving?.attentionScore ?? 0) < minAttention) {
      opportunities.push({
        type: "deadline-undervalued",
        market: scored,
        reason: "High edge, low attention",
        edge: scored.edge,
        attention: moving?.attentionScore ?? 0,
      });
    }
  }

  // Momentum opportunities
  for (const moving of args.movingScores) {
    if (!moving) continue;
    
    if (
      (moving.attentionScore ?? 0) >= minAttention &&
      Math.abs(moving.priceChange24h ?? 0) > 0.1
    ) {
      opportunities.push({
        type: "momentum",
        market: moving,
        reason: "High attention + strong price movement",
        attention: moving.attentionScore,
        priceChange: moving.priceChange24h,
      });
    }
  }

  return opportunities;
}

/**
 * Utility: clamp value between 0 and 1
 */
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
