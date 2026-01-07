/**
 * Probability Models
 * Core models for computing delay risk and adjusted probabilities
 */

import { timeRemainingDays } from "./deadline";

export type ModelOutput = {
  modelProb: number;
  delayRisk: number;
  rationale: string[];
  confidence: number;
};

/**
 * Deadline delay model
 * Adjusts market probability based on time remaining and complexity
 */
export function deadlineDelayModel(args: {
  marketProb: number;
  endDate?: Date | null;
  liquidity?: number | null;
  category?: string | null;
}): ModelOutput {
  const days = timeRemainingDays(args.endDate);
  const rationale: string[] = [];
  const marketProb = clamp01(args.marketProb);

  if (days === null) {
    return {
      modelProb: marketProb,
      delayRisk: 0,
      confidence: 0.3,
      rationale: ["No deadline available; cannot assess delay risk."],
    };
  }

  let delayPenalty = 0;
  let confidence = 0.7;

  // Time-based penalties
  if (days < 7) {
    delayPenalty += 0.25;
    confidence = 0.9;
    rationale.push("< 7 days: Very high delay risk for unfinished items.");
  } else if (days < 30) {
    delayPenalty += 0.18;
    confidence = 0.85;
    rationale.push("< 30 days: High delay risk; insufficient buffer.");
  } else if (days < 90) {
    delayPenalty += 0.10;
    confidence = 0.75;
    rationale.push("< 90 days: Moderate delay risk.");
  } else if (days < 180) {
    delayPenalty += 0.04;
    confidence = 0.65;
    rationale.push("< 6 months: Light delay risk.");
  } else {
    delayPenalty += 0.02;
    confidence = 0.5;
    rationale.push("> 6 months: Minimal delay risk from timeline.");
  }

  // Liquidity-based adjustment (thin markets = noise)
  const liq = args.liquidity ?? 0;
  if (liq < 5000) {
    delayPenalty += 0.08;
    confidence *= 0.9;
    rationale.push("Low liquidity: Price may be noisy/optimistic.");
  } else if (liq < 20000) {
    delayPenalty += 0.04;
    confidence *= 0.95;
    rationale.push("Medium liquidity: Some noise expected.");
  } else {
    rationale.push("High liquidity: Price likely more accurate.");
  }

  // Category-specific adjustments
  const cat = (args.category ?? "").toLowerCase();
  if (cat.includes("crypto") || cat.includes("protocol")) {
    delayPenalty += 0.05;
    rationale.push("Crypto/protocol: Historical delays common.");
  } else if (cat.includes("regulation") || cat.includes("legal")) {
    delayPenalty += 0.08;
    rationale.push("Regulatory/legal: Procedural delays expected.");
  } else if (cat.includes("politics")) {
    delayPenalty += 0.03;
    rationale.push("Politics: Moderate unpredictability.");
  }

  const modelProb = clamp01(marketProb - delayPenalty);
  const delayRisk = clamp01(delayPenalty / 0.30); // Normalize to 0-1

  return {
    modelProb,
    delayRisk,
    confidence,
    rationale,
  };
}

/**
 * Volume spike model
 * Detects unusual volume patterns
 */
export function volumeSpikeScore(args: {
  volume24h?: number | null;
  volumeHistory: number[];
}): {
  volumeZScore: number;
  isSpike: boolean;
  rationale: string;
} {
  const current = args.volume24h ?? 0;
  const history = args.volumeHistory.filter(v => v > 0);

  if (history.length < 3) {
    return {
      volumeZScore: 0,
      isSpike: false,
      rationale: "Insufficient volume history",
    };
  }

  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return {
      volumeZScore: 0,
      isSpike: false,
      rationale: "No volume variance detected",
    };
  }

  const zScore = (current - mean) / stdDev;
  const isSpike = zScore > 2.0;

  let rationale = `Current: ${current.toFixed(0)}, Mean: ${mean.toFixed(0)}, Z: ${zScore.toFixed(2)}`;
  if (isSpike) {
    rationale += " - SPIKE DETECTED";
  }

  return {
    volumeZScore: zScore,
    isSpike,
    rationale,
  };
}

/**
 * Price velocity model
 * Measures rate of price change
 */
export function priceVelocity(priceHistory: Array<{ price: number; timestamp: Date }>): {
  velocity1h: number;
  velocity24h: number;
  acceleration: number;
} {
  if (priceHistory.length < 2) {
    return { velocity1h: 0, velocity24h: 0, acceleration: 0 };
  }

  const sorted = [...priceHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const now = new Date();

  // 1-hour velocity
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentPrices = sorted.filter(p => p.timestamp >= oneHourAgo);
  const velocity1h = recentPrices.length >= 2
    ? recentPrices[0].price - recentPrices[recentPrices.length - 1].price
    : 0;

  // 24-hour velocity
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dayPrices = sorted.filter(p => p.timestamp >= oneDayAgo);
  const velocity24h = dayPrices.length >= 2
    ? dayPrices[0].price - dayPrices[dayPrices.length - 1].price
    : 0;

  // Acceleration (change in velocity)
  const acceleration = velocity1h - velocity24h / 24;

  return {
    velocity1h,
    velocity24h,
    acceleration,
  };
}

/**
 * Attention score model
 * Estimates market attention level
 */
export function attentionScore(args: {
  volume24h?: number | null;
  priceChange24h?: number | null;
  liquidity?: number | null;
}): number {
  const volume = args.volume24h ?? 0;
  const priceChange = Math.abs(args.priceChange24h ?? 0);
  const liquidity = args.liquidity ?? 0;

  // Normalize each factor
  const volumeScore = Math.min(volume / 100000, 1) * 0.4;
  const priceScore = Math.min(priceChange / 0.2, 1) * 0.4;
  const liquidityScore = Math.min(liquidity / 50000, 1) * 0.2;

  return volumeScore + priceScore + liquidityScore;
}

/**
 * Utility: clamp value between 0 and 1
 */
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
