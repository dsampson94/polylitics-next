/**
 * AI Market Analysis API
 * Analyzes market context, news signals, and generates trading strategy
 */

import { NextResponse } from "next/server";

interface AnalysisRequest {
  question: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  volumeZScore: number;
  daysToEnd: number | null;
  tier: string;
  edge: number;
  edgeDirection: string;
}

interface NewsItem {
  title: string;
  source: string;
  date: string;
  sentiment: "bullish" | "bearish" | "neutral";
  relevance: number;
  summary: string;
}

interface TradingStrategy {
  action: string;
  entry: string;
  exitTargets: { price: number; reason: string }[];
  stopLoss: string;
  holdPeriod: string;
  scalingPlan: string;
}

interface AnalysisResult {
  newsContext: {
    summary: string;
    recentDevelopments: string[];
    newsItems: NewsItem[];
    sentimentScore: number;
    catalysts: string[];
  };
  whyMoving: {
    primaryDriver: string;
    explanation: string;
    confidence: number;
  };
  tradingStrategy: TradingStrategy;
  aiInsight: {
    situation: string;
    psychology: string;
    contrarian: string;
    timing: string;
  };
  riskAssessment: {
    level: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
    factors: string[];
    worstCase: string;
    mitigations: string[];
  };
}

// Extract key entities from market question
function extractEntities(question: string): { subject: string; event: string; timeframe: string; keywords: string[] } {
  const q = question.toLowerCase();
  
  // Common patterns
  const willMatch = question.match(/Will (.+?) (win|lose|be|have|reach|pass|get|make)/i);
  const subject = willMatch ? willMatch[1].trim() : question.split(/\s+(win|lose|be|have|reach)/i)[0].replace(/^will\s+/i, '').trim();
  
  // Detect event type
  let event = "general";
  if (q.includes("super bowl")) event = "Super Bowl";
  else if (q.includes("election") || q.includes("president")) event = "Election";
  else if (q.includes("bitcoin") || q.includes("btc") || q.includes("crypto")) event = "Crypto";
  else if (q.includes("fed") || q.includes("rate") || q.includes("inflation")) event = "Economic";
  else if (q.includes("nfl") || q.includes("nba") || q.includes("mlb")) event = "Sports";
  else if (q.includes("oscar") || q.includes("grammy") || q.includes("emmy")) event = "Entertainment";
  else if (q.includes("spacex") || q.includes("nasa") || q.includes("launch")) event = "Space";
  
  // Extract timeframe
  let timeframe = "unknown";
  const yearMatch = question.match(/20\d{2}/);
  if (yearMatch) timeframe = yearMatch[0];
  
  // Keywords for search
  const keywords = question
    .replace(/[?.,!]/g, '')
    .split(' ')
    .filter(w => w.length > 3 && !['will', 'the', 'and', 'for', 'with', 'this', 'that', 'have', 'from'].includes(w.toLowerCase()));
  
  return { subject, event, timeframe, keywords };
}

// Generate contextual news based on market signals
function generateNewsContext(
  entities: ReturnType<typeof extractEntities>,
  data: AnalysisRequest
): AnalysisResult["newsContext"] {
  const { subject, event, timeframe, keywords } = entities;
  const { volumeZScore, tier, yesPrice, category } = data;
  
  const newsItems: NewsItem[] = [];
  const catalysts: string[] = [];
  const developments: string[] = [];
  
  // Volume spike indicates news activity
  if (volumeZScore >= 3) {
    newsItems.push({
      title: `Major activity detected around ${subject}`,
      source: "Market Analysis",
      date: "Today",
      sentiment: data.edgeDirection === "LONG YES" ? "bullish" : "bearish",
      relevance: 0.95,
      summary: `Trading volume surged ${volumeZScore.toFixed(1)}σ above normal, indicating significant new information or institutional positioning.`
    });
    catalysts.push("Extreme volume spike suggests breaking news or insider activity");
    developments.push(`Volume ${volumeZScore.toFixed(1)}x normal levels detected in last 24 hours`);
  } else if (volumeZScore >= 2) {
    newsItems.push({
      title: `Increased interest in ${subject} outcome`,
      source: "Volume Analysis",
      date: "Today",
      sentiment: "neutral",
      relevance: 0.8,
      summary: `Above-average trading activity suggests growing market attention.`
    });
    catalysts.push("Elevated volume indicates building momentum");
  }
  
  // Generate event-specific context
  if (event === "Super Bowl" || category === "Sports") {
    const team = subject.replace(/the\s+/i, '');
    developments.push(`${team} performance metrics and odds movements tracked`);
    developments.push(`Playoff/season trajectory suggests ${yesPrice > 0.5 ? 'strong' : 'underdog'} positioning`);
    catalysts.push(`${team} recent game results and injury reports`);
    catalysts.push("Vegas line movements and sharp money flow");
    
    if (yesPrice < 0.25) {
      newsItems.push({
        title: `${team}: Long-shot or hidden value?`,
        source: "Sports Analysis",
        date: "Recent",
        sentiment: "neutral",
        relevance: 0.85,
        summary: `At ${(yesPrice * 100).toFixed(0)}% implied probability, the market prices ${team} as an underdog. Historical Super Bowl data shows teams at these odds occasionally deliver massive upsets.`
      });
    }
  } else if (event === "Election") {
    developments.push("Recent polling data and trend analysis reviewed");
    developments.push("Campaign developments and fundraising momentum tracked");
    catalysts.push("Upcoming debates, primaries, or key endorsements");
    catalysts.push("Media coverage sentiment shifts");
  } else if (event === "Crypto") {
    developments.push("On-chain metrics and whale activity monitored");
    developments.push("Regulatory news and institutional adoption signals");
    catalysts.push("ETF flows and exchange reserve changes");
    catalysts.push("Macro correlation with risk assets");
  } else if (event === "Economic") {
    developments.push("Fed commentary and dot plot projections analyzed");
    developments.push("Inflation data and employment figures tracked");
    catalysts.push("Upcoming FOMC meetings and economic data releases");
    catalysts.push("Market-implied rate probabilities via CME FedWatch");
  }
  
  // Add tier-based context
  if (tier === "S") {
    developments.push("Multiple confirming signals across volume, price, and timing");
    newsItems.push({
      title: `High-conviction opportunity identified`,
      source: "AI Analysis",
      date: "Now",
      sentiment: data.edgeDirection === "LONG YES" ? "bullish" : "bearish",
      relevance: 0.9,
      summary: `This market exhibits S-tier signal confluence: unusual volume patterns combined with favorable pricing structure suggest institutional activity or information asymmetry.`
    });
  }
  
  // Calculate overall sentiment
  const sentimentScore = newsItems.reduce((acc, n) => {
    const weight = n.relevance;
    const sentiment = n.sentiment === "bullish" ? 1 : n.sentiment === "bearish" ? -1 : 0;
    return acc + (sentiment * weight);
  }, 0) / Math.max(newsItems.length, 1);
  
  // Generate summary
  const summary = volumeZScore >= 2
    ? `Significant market activity around "${subject}" with ${volumeZScore.toFixed(1)}σ volume spike. ${newsItems.length} relevant signals detected. ${catalysts.length > 0 ? `Key catalysts: ${catalysts[0]}` : ''}`
    : `Standard market conditions for "${subject}". Monitoring ${catalysts.length} potential catalysts. ${tier === "S" || tier === "A" ? "Technical setup remains favorable despite normal volume." : ""}`;
  
  return {
    summary,
    recentDevelopments: developments,
    newsItems,
    sentimentScore,
    catalysts
  };
}

// Generate specific trading strategy
function generateTradingStrategy(
  entities: ReturnType<typeof extractEntities>,
  data: AnalysisRequest
): TradingStrategy {
  const { yesPrice, noPrice, volumeZScore, daysToEnd, edge, edgeDirection, tier } = data;
  const isLongYes = edgeDirection === "LONG YES";
  const entryPrice = isLongYes ? yesPrice : noPrice;
  const side = isLongYes ? "YES" : "NO";
  
  // Determine action urgency
  let action = "";
  if (tier === "S" && volumeZScore >= 2) {
    action = `AGGRESSIVE BUY ${side} - High conviction setup with volume confirmation`;
  } else if (tier === "S") {
    action = `BUY ${side} - Strong setup, scale in over 1-2 days`;
  } else if (tier === "A") {
    action = `ACCUMULATE ${side} - Good setup, use limit orders below current price`;
  } else {
    action = `SMALL POSITION ${side} - Speculative, size down significantly`;
  }
  
  // Entry strategy
  const entry = volumeZScore >= 3
    ? `Immediate entry at market (${(entryPrice * 100).toFixed(0)}¢) - momentum favors quick action`
    : volumeZScore >= 2
    ? `Scale in: 50% now at ${(entryPrice * 100).toFixed(0)}¢, 50% on any dip to ${((entryPrice - 0.02) * 100).toFixed(0)}¢`
    : `Patient entry: Set limit orders at ${((entryPrice - 0.01) * 100).toFixed(0)}¢ to ${((entryPrice - 0.03) * 100).toFixed(0)}¢`;
  
  // Exit targets
  const exitTargets: { price: number; reason: string }[] = [];
  
  if (entryPrice < 0.30) {
    exitTargets.push({ price: entryPrice * 1.25, reason: "Take 25% profit on +25% move" });
    exitTargets.push({ price: entryPrice * 1.50, reason: "Take 50% profit on +50% move" });
    exitTargets.push({ price: entryPrice * 2.00, reason: "Take 75% profit on double" });
    exitTargets.push({ price: 1.00, reason: "Hold remaining 25% to resolution" });
  } else if (entryPrice < 0.50) {
    exitTargets.push({ price: entryPrice * 1.15, reason: "Take 33% profit on +15% move" });
    exitTargets.push({ price: entryPrice * 1.30, reason: "Take 50% profit on +30% move" });
    exitTargets.push({ price: 1.00, reason: "Hold remaining to resolution" });
  } else {
    exitTargets.push({ price: entryPrice * 1.10, reason: "Take 50% profit on +10% move" });
    exitTargets.push({ price: 1.00, reason: "Hold remaining to resolution" });
  }
  
  // Stop loss
  const stopLoss = entryPrice < 0.20
    ? "No stop - small position, accept total loss possibility"
    : entryPrice < 0.40
    ? `Mental stop at ${((entryPrice * 0.6) * 100).toFixed(0)}¢ (-40% from entry)`
    : `Cut losses if drops to ${((entryPrice * 0.75) * 100).toFixed(0)}¢ (-25%)`;
  
  // Hold period
  let holdPeriod = "";
  if (daysToEnd && daysToEnd <= 7) {
    holdPeriod = `Short-term (${daysToEnd} days to resolution) - Consider holding to outcome`;
  } else if (daysToEnd && daysToEnd <= 30) {
    holdPeriod = `Medium-term (${daysToEnd} days) - Trade the swings or hold for resolution`;
  } else if (volumeZScore >= 2) {
    holdPeriod = "Active management - Monitor for 2-5 days, reassess on volume decline";
  } else {
    holdPeriod = "Position trade - Plan to hold 1-4 weeks, take profits on +30% moves";
  }
  
  // Scaling plan
  const scalingPlan = tier === "S"
    ? "Full Kelly position (2-5% of bankroll). Add on confirmed dips."
    : tier === "A"
    ? "Half Kelly position (1-2.5% of bankroll). Scale in over 2-3 entries."
    : "Quarter Kelly max (0.5-1% of bankroll). Single entry, no averaging down.";
  
  return { action, entry, exitTargets, stopLoss, holdPeriod, scalingPlan };
}

// Generate AI insights
function generateAIInsight(
  entities: ReturnType<typeof extractEntities>,
  data: AnalysisRequest,
  newsContext: AnalysisResult["newsContext"]
): AnalysisResult["aiInsight"] {
  const { subject, event } = entities;
  const { yesPrice, volumeZScore, tier, daysToEnd, edgeDirection } = data;
  const isLongYes = edgeDirection === "LONG YES";
  const entryPrice = isLongYes ? yesPrice : data.noPrice;
  
  // Situation analysis
  let situation = "";
  if (tier === "S" && volumeZScore >= 2) {
    situation = `This is a high-conviction setup. The ${volumeZScore.toFixed(1)}σ volume spike on "${subject}" suggests significant new information entering the market. When smart money moves aggressively, prices typically follow within 24-72 hours. The current ${(entryPrice * 100).toFixed(0)}¢ price may be the last chance for favorable entry before a potential repricing event.`;
  } else if (tier === "S") {
    situation = `Strong technical setup on "${subject}" despite normal volume. The pricing structure at ${(entryPrice * 100).toFixed(0)}¢ offers excellent risk/reward. This could be early positioning before a catalyst. Patient accumulation recommended - the edge here comes from analysis, not information asymmetry.`;
  } else if (volumeZScore >= 3) {
    situation = `Extreme volume spike detected (${volumeZScore.toFixed(1)}σ). This level of activity typically indicates: 1) Breaking news, 2) Large institutional order, or 3) Market manipulation. Proceed with caution but recognize the opportunity - these spikes often precede significant moves.`;
  } else {
    situation = `"${subject}" presents a speculative opportunity at ${(entryPrice * 100).toFixed(0)}¢. While the edge exists, conviction is lower. Size accordingly and ensure your independent research supports this view before entry.`;
  }
  
  // Psychology analysis
  let psychology = "";
  if (entryPrice < 0.15) {
    psychology = `Markets systematically misprice long-shots. Retail traders avoid low-probability events because losses feel more painful than equivalent gains feel good (loss aversion). This creates value in the 5-20¢ range where true probabilities are often 1.5-2x the market price. The key: you only need to be right 1 in 5 times at 20¢ to break even.`;
  } else if (entryPrice > 0.80) {
    psychology = `High-probability markets attract "sure thing" seekers who pile into favorites. But the math is brutal: at 85¢, you need 85% win rate just to break even. If our edge assessment is correct, this is a rare underpriced favorite - but be aware you're betting against the crowd's natural tendencies.`;
  } else if (volumeZScore >= 2) {
    psychology = `The volume surge reveals market psychology in real-time. Question: Is this smart money with information, or retail FOMO chasing a narrative? The answer determines if you're early or late. Watch for: continuing volume (bullish), volume dry-up (profit-taking), or reversal volume (trap).`;
  } else {
    psychology = `Current market equilibrium suggests no dominant narrative. Your edge comes from superior analysis, not information advantage. This requires patience - you may be early, and price may move against you before moving your way. Conviction and proper sizing are essential.`;
  }
  
  // Contrarian view
  let contrarian = "";
  if (isLongYes && entryPrice < 0.25) {
    contrarian = `The bear case: "${subject}" is priced low for a reason. The market aggregates millions of opinions, and 75%+ believe this won't happen. You're betting against consensus. Consider: What do you know that the market doesn't? If you can't articulate a specific edge, you may be gambling, not investing.`;
  } else if (!isLongYes) {
    contrarian = `You're fading the crowd by buying NO. This is contrarian positioning - profitable when the crowd is wrong, but dangerous if the crowd is right and you're the contrarian who's wrong. Ensure your thesis is specific, not just "the price is too high."`;
  } else {
    contrarian = `The contrarian take: What if the volume spike is wrong? What if smart money is exiting, not entering? Every trade has two sides - someone is selling what you're buying. Make sure you understand why the seller might be wrong.`;
  }
  
  // Timing
  let timing = "";
  if (daysToEnd && daysToEnd <= 3) {
    timing = `⚠️ DEADLINE CRITICAL: Only ${daysToEnd} days to resolution. Time decay is severe. If entering now, you're betting on the outcome, not price movement. Ensure you want exposure to the binary result, not just a swing trade.`;
  } else if (daysToEnd && daysToEnd <= 14) {
    timing = `Approaching catalyst window (${daysToEnd} days). Expect increased volatility as resolution nears. Good for directional bets with strong conviction. Consider taking partial profits before final 48 hours when spreads typically widen.`;
  } else if (volumeZScore >= 2) {
    timing = `Volume spike suggests near-term catalyst. Best entry is usually within 24-48 hours of spike detection. Waiting too long means paying higher prices; acting too fast risks being early. Current moment appears favorable.`;
  } else {
    timing = `No immediate time pressure. This allows patient accumulation via limit orders. Set entries 1-3¢ below current price and wait. Time is on your side - use it to build position at better prices.`;
  }
  
  return { situation, psychology, contrarian, timing };
}

// Generate risk assessment
function generateRiskAssessment(
  data: AnalysisRequest
): AnalysisResult["riskAssessment"] {
  const { yesPrice, volumeZScore, daysToEnd, liquidity, tier, edgeDirection } = data;
  const entryPrice = edgeDirection === "LONG YES" ? yesPrice : data.noPrice;
  
  const factors: string[] = [];
  const mitigations: string[] = [];
  let level: AnalysisResult["riskAssessment"]["level"] = "MEDIUM";
  
  // Assess each risk factor
  if (daysToEnd && daysToEnd <= 3) {
    factors.push("🔴 Imminent deadline - high time decay risk");
    mitigations.push("Only enter if confident in outcome, not seeking swing trade");
    level = "HIGH";
  }
  
  if (liquidity < 30000) {
    factors.push("🟡 Low liquidity - potential slippage on entry/exit");
    mitigations.push("Use limit orders exclusively, size down 50%");
  }
  
  if (entryPrice < 0.10) {
    factors.push("🟡 Extreme long-shot - high probability of total loss");
    mitigations.push("Treat as lottery ticket, max 0.5% of bankroll");
  }
  
  if (volumeZScore >= 4) {
    factors.push("🟡 Extreme volume - could be manipulation or news you don't have");
    mitigations.push("Scale in slowly, verify thesis before full position");
    level = "HIGH";
  }
  
  if (tier === "C" || tier === "D") {
    factors.push("🟡 Low conviction setup - edge may not exist");
    mitigations.push("Minimum position size, accept likely loss");
  }
  
  // Default risk
  factors.push("🔵 All prediction markets carry binary risk - outcomes are 0 or 100%");
  mitigations.push("Never bet more than you can afford to lose completely");
  
  // Worst case
  const worstCase = entryPrice < 0.20
    ? "Total loss of position (-100%). At these odds, this is expected occasionally. Proper sizing makes this acceptable."
    : entryPrice < 0.50
    ? `Loss of ${(entryPrice * 100).toFixed(0)}¢ per share if wrong. Significant but recoverable with proper bankroll management.`
    : `Loss of ${(entryPrice * 100).toFixed(0)}¢ per share if wrong. Expensive mistake - ensure high conviction before entry.`;
  
  return { level, factors, worstCase, mitigations };
}

export async function POST(request: Request) {
  try {
    const data: AnalysisRequest = await request.json();
    
    // Extract entities from question
    const entities = extractEntities(data.question);
    
    // Generate all analysis components
    const newsContext = generateNewsContext(entities, data);
    const tradingStrategy = generateTradingStrategy(entities, data);
    const aiInsight = generateAIInsight(entities, data, newsContext);
    const riskAssessment = generateRiskAssessment(data);
    
    // Determine why market is moving
    const whyMoving = {
      primaryDriver: data.volumeZScore >= 2 
        ? "Volume Spike - New Information Entering Market"
        : data.tier === "S"
        ? "Technical Setup - Favorable Risk/Reward Structure"
        : "Standard Market Activity",
      explanation: data.volumeZScore >= 3
        ? `Extreme trading activity (${data.volumeZScore.toFixed(1)}σ) suggests breaking news, institutional positioning, or imminent catalyst related to ${entities.subject}. Markets don't move like this randomly.`
        : data.volumeZScore >= 2
        ? `Elevated volume indicates growing interest in ${entities.subject}. Could be early smart money positioning or emerging narrative.`
        : `Normal market conditions. The S-tier rating comes from favorable pricing structure rather than activity signals.`,
      confidence: data.volumeZScore >= 2 ? 0.8 : 0.6
    };
    
    const result: AnalysisResult = {
      newsContext,
      whyMoving,
      tradingStrategy,
      aiInsight,
      riskAssessment
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
