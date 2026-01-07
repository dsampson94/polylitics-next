/**
 * Advanced Scoring Engine
 * Multi-factor analysis for maximum edge detection
 */

import { deadlineDelayModel, volumeSpikeScore, attentionScore } from "./model";
import { timeRemainingDays, deadlineUrgency, looksLikeByDateMarket } from "./deadline";

export type OpportunitySignal = {
  type: "deadline-overpriced" | "momentum-entry" | "attention-arbitrage" | "volume-precursor" | "mean-reversion";
  strength: number; // 0-1
  direction: "YES" | "NO" | "WATCH";
  confidence: number;
  rationale: string[];
};

export type AdvancedScore = {
  id: string;
  title: string;
  category?: string | null;
  
  // Prices
  currentYesPrice: number;
  currentNoPrice: number;
  
  // Model outputs
  modelProb: number;
  edge: number;
  edgeDirection: "YES" | "NO";
  
  // Risk metrics
  delayRisk: number;
  volatility: number;
  liquidityScore: number;
  
  // Timing
  timeRemainingDays: number | null;
  urgency: string;
  
  // Attention
  attentionScore: number;
  volumeZScore: number;
  isVolumeSpike: boolean;
  
  // Momentum
  priceVelocity1h: number;
  priceVelocity24h: number;
  momentum: "bullish" | "bearish" | "neutral";
  
  // Signals
  signals: OpportunitySignal[];
  primarySignal: OpportunitySignal | null;
  
  // Position sizing
  kellyFraction: number;
  suggestedSize: "skip" | "small" | "medium" | "large";
  
  // Overall
  compositeScore: number; // 0-100
  tier: "S" | "A" | "B" | "C" | "D";
};

/**
 * Kelly Criterion for position sizing
 */
export function calculateKelly(args: {
  modelProb: number;
  marketPrice: number;
  direction: "YES" | "NO";
}): number {
  const { modelProb, marketPrice, direction } = args;
  
  // For YES bet: pay marketPrice to win 1
  // For NO bet: pay (1 - marketPrice) to win 1
  
  const p = direction === "YES" ? modelProb : 1 - modelProb;
  const price = direction === "YES" ? marketPrice : 1 - marketPrice;
  
  if (price <= 0 || price >= 1) return 0;
  
  // Win amount per unit bet
  const b = (1 - price) / price;
  
  // Kelly: f = (bp - q) / b where q = 1-p
  const q = 1 - p;
  const kelly = (b * p - q) / b;
  
  // Clamp to reasonable range (0 to 25% of bankroll)
  return Math.max(0, Math.min(0.25, kelly));
}

/**
 * Detect momentum regime
 */
export function detectMomentum(args: {
  velocity1h: number;
  velocity24h: number;
  volumeZScore: number;
}): "bullish" | "bearish" | "neutral" {
  const { velocity1h, velocity24h, volumeZScore } = args;
  
  // Strong momentum if both velocities agree and volume confirms
  if (velocity1h > 0.02 && velocity24h > 0.03 && volumeZScore > 1) {
    return "bullish";
  }
  if (velocity1h < -0.02 && velocity24h < -0.03 && volumeZScore > 1) {
    return "bearish";
  }
  
  // Weak momentum
  if (velocity24h > 0.05) return "bullish";
  if (velocity24h < -0.05) return "bearish";
  
  return "neutral";
}

/**
 * Generate trading signals
 */
export function generateSignals(args: {
  edge: number;
  edgeDirection: "YES" | "NO";
  delayRisk: number;
  isByDate: boolean;
  attentionScore: number;
  volumeZScore: number;
  isVolumeSpike: boolean;
  momentum: "bullish" | "bearish" | "neutral";
  velocity24h: number;
  timeRemainingDays: number | null;
  liquidity: number;
}): OpportunitySignal[] {
  const signals: OpportunitySignal[] = [];
  
  // 1. Deadline Overpriced Signal
  if (args.isByDate && args.delayRisk > 0.5 && args.edge < -0.05) {
    signals.push({
      type: "deadline-overpriced",
      strength: Math.min(1, Math.abs(args.edge) * 5),
      direction: "NO",
      confidence: 0.7 + args.delayRisk * 0.2,
      rationale: [
        `High delay risk (${(args.delayRisk * 100).toFixed(0)}%)`,
        `Market overpriced by ${(Math.abs(args.edge) * 100).toFixed(1)}%`,
        args.timeRemainingDays && args.timeRemainingDays < 30 
          ? `Only ${args.timeRemainingDays.toFixed(0)} days remaining`
          : "Procedural delays expected",
      ],
    });
  }
  
  // 2. Momentum Entry Signal
  if (args.momentum !== "neutral" && args.isVolumeSpike && Math.abs(args.velocity24h) > 0.08) {
    signals.push({
      type: "momentum-entry",
      strength: Math.min(1, Math.abs(args.velocity24h) * 5),
      direction: args.momentum === "bullish" ? "YES" : "NO",
      confidence: 0.6 + args.volumeZScore * 0.1,
      rationale: [
        `Strong ${args.momentum} momentum`,
        `Price moved ${(args.velocity24h * 100).toFixed(1)}% in 24h`,
        `Volume spike detected (z=${args.volumeZScore.toFixed(1)})`,
      ],
    });
  }
  
  // 3. Attention Arbitrage (low attention + high edge)
  if (args.attentionScore < 0.3 && Math.abs(args.edge) > 0.08) {
    signals.push({
      type: "attention-arbitrage",
      strength: Math.abs(args.edge) * 3,
      direction: args.edgeDirection,
      confidence: 0.65,
      rationale: [
        "Low market attention",
        `Significant edge: ${(args.edge * 100).toFixed(1)}%`,
        "Potential early entry before crowd",
      ],
    });
  }
  
  // 4. Volume Precursor (volume spike without price move)
  if (args.isVolumeSpike && Math.abs(args.velocity24h) < 0.03) {
    signals.push({
      type: "volume-precursor",
      strength: args.volumeZScore / 4,
      direction: "WATCH",
      confidence: 0.5,
      rationale: [
        "Volume spike detected",
        "Price hasn't moved significantly yet",
        "Possible accumulation phase",
      ],
    });
  }
  
  // 5. Mean Reversion (extreme move, high volume, likely pullback)
  if (Math.abs(args.velocity24h) > 0.15 && args.volumeZScore > 2.5) {
    signals.push({
      type: "mean-reversion",
      strength: Math.min(1, Math.abs(args.velocity24h) * 3),
      direction: args.velocity24h > 0 ? "NO" : "YES",
      confidence: 0.55,
      rationale: [
        `Extreme price move: ${(args.velocity24h * 100).toFixed(1)}%`,
        "High volume exhaustion likely",
        "Potential reversion opportunity",
      ],
    });
  }
  
  return signals.sort((a, b) => b.strength * b.confidence - a.strength * a.confidence);
}

/**
 * Calculate composite score (0-100)
 */
export function calculateCompositeScore(args: {
  edge: number;
  delayRisk: number;
  attentionScore: number;
  volumeZScore: number;
  liquidityScore: number;
  momentum: "bullish" | "bearish" | "neutral";
  signals: OpportunitySignal[];
}): number {
  let score = 50; // Base score
  
  // Edge contribution (±30 points)
  score += Math.abs(args.edge) * 100 * 0.3;
  
  // Signal strength contribution (±25 points)
  if (args.signals.length > 0) {
    const avgSignalStrength = args.signals.reduce((sum, s) => sum + s.strength * s.confidence, 0) / args.signals.length;
    score += avgSignalStrength * 25;
  }
  
  // Liquidity bonus (up to 10 points)
  score += args.liquidityScore * 10;
  
  // Volume activity bonus (up to 10 points)
  score += Math.min(10, args.volumeZScore * 3);
  
  // Momentum alignment bonus (up to 10 points)
  if (args.momentum !== "neutral") {
    score += 5;
  }
  
  // Penalty for low attention (harder to exit)
  if (args.attentionScore < 0.2) {
    score -= 5;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine tier from composite score
 */
export function scoreTier(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= 80) return "S";
  if (score >= 65) return "A";
  if (score >= 50) return "B";
  if (score >= 35) return "C";
  return "D";
}

/**
 * Suggest position size
 */
export function suggestSize(kelly: number, tier: string, liquidity: number): "skip" | "small" | "medium" | "large" {
  if (kelly < 0.02 || tier === "D") return "skip";
  if (liquidity < 5000) return "small";
  
  if (kelly >= 0.15 && (tier === "S" || tier === "A")) return "large";
  if (kelly >= 0.08 && tier !== "D") return "medium";
  
  return "small";
}

/**
 * Full advanced scoring for a market
 */
export function scoreMarketAdvanced(args: {
  id: string;
  title: string;
  description?: string | null;
  rules?: string | null;
  category?: string | null;
  endDate?: Date | null;
  snapshots: Array<{
    capturedAt: Date;
    yesPrice?: number | null;
    noPrice?: number | null;
    volume24h?: number | null;
    liquidity?: number | null;
    priceChange1h?: number | null;
    priceChange24h?: number | null;
  }>;
}): AdvancedScore | null {
  if (args.snapshots.length === 0) return null;
  
  const latest = args.snapshots[0];
  const currentYesPrice = latest.yesPrice ?? 0.5;
  const currentNoPrice = latest.noPrice ?? (1 - currentYesPrice);
  
  if (currentYesPrice <= 0 || currentYesPrice >= 1) return null;
  
  // Detect if by-date market
  const isByDate = looksLikeByDateMarket(args.title, args.rules, args.description);
  
  // Calculate delay model
  const delayOutput = deadlineDelayModel({
    marketProb: currentYesPrice,
    endDate: args.endDate,
    liquidity: latest.liquidity,
    category: args.category,
  });
  
  // Calculate edge
  const edge = delayOutput.modelProb - currentYesPrice;
  const edgeDirection: "YES" | "NO" = edge >= 0 ? "YES" : "NO";
  
  // Time remaining
  const timeRemaining = timeRemainingDays(args.endDate);
  const urgency = deadlineUrgency(timeRemaining);
  
  // Volume analysis
  const volumeHistory = args.snapshots.slice(1, 20).map(s => s.volume24h ?? 0).filter(v => v > 0);
  const volumeAnalysis = volumeSpikeScore({
    volume24h: latest.volume24h,
    volumeHistory,
  });
  
  // Attention
  const attention = attentionScore({
    volume24h: latest.volume24h,
    priceChange24h: latest.priceChange24h,
    liquidity: latest.liquidity,
  });
  
  // Liquidity score (0-1)
  const liq = latest.liquidity ?? 0;
  const liquidityScore = Math.min(1, liq / 50000);
  
  // Price velocity
  const velocity1h = latest.priceChange1h ?? 0;
  const velocity24h = latest.priceChange24h ?? 0;
  
  // Volatility (std dev of recent prices)
  const prices = args.snapshots.slice(0, 20).map(s => s.yesPrice ?? 0).filter(p => p > 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : currentYesPrice;
  const variance = prices.length > 1 
    ? prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length 
    : 0;
  const volatility = Math.sqrt(variance);
  
  // Momentum
  const momentum = detectMomentum({
    velocity1h,
    velocity24h,
    volumeZScore: volumeAnalysis.volumeZScore,
  });
  
  // Generate signals
  const signals = generateSignals({
    edge,
    edgeDirection,
    delayRisk: delayOutput.delayRisk,
    isByDate,
    attentionScore: attention,
    volumeZScore: volumeAnalysis.volumeZScore,
    isVolumeSpike: volumeAnalysis.isSpike,
    momentum,
    velocity24h,
    timeRemainingDays: timeRemaining,
    liquidity: liq,
  });
  
  // Kelly sizing
  const kelly = calculateKelly({
    modelProb: delayOutput.modelProb,
    marketPrice: currentYesPrice,
    direction: edgeDirection,
  });
  
  // Composite score
  const compositeScore = calculateCompositeScore({
    edge,
    delayRisk: delayOutput.delayRisk,
    attentionScore: attention,
    volumeZScore: volumeAnalysis.volumeZScore,
    liquidityScore,
    momentum,
    signals,
  });
  
  const tier = scoreTier(compositeScore);
  const suggestedSizeValue = suggestSize(kelly, tier, liq);
  
  return {
    id: args.id,
    title: args.title,
    category: args.category,
    currentYesPrice,
    currentNoPrice,
    modelProb: delayOutput.modelProb,
    edge,
    edgeDirection,
    delayRisk: delayOutput.delayRisk,
    volatility,
    liquidityScore,
    timeRemainingDays: timeRemaining,
    urgency,
    attentionScore: attention,
    volumeZScore: volumeAnalysis.volumeZScore,
    isVolumeSpike: volumeAnalysis.isSpike,
    priceVelocity1h: velocity1h,
    priceVelocity24h: velocity24h,
    momentum,
    signals,
    primarySignal: signals[0] ?? null,
    kellyFraction: kelly,
    suggestedSize: suggestedSizeValue,
    compositeScore,
    tier,
  };
}
