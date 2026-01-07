/**
 * Live Polymarket Data API
 * Fetches directly from Polymarket API - no database required
 * 
 * SCORING PHILOSOPHY:
 * - TRUE opportunities have mispriced odds with liquidity to exploit
 * - Markets at 0-5¢ or 95-100¢ are essentially RESOLVED, not opportunities
 * - Good opportunities are in the 15-40¢ or 60-85¢ range with high volume
 * - Volume + Liquidity = ability to actually trade the edge
 * - Deadline proximity adds urgency but also risk
 */

import { NextResponse } from "next/server";

const GAMMA_API = "https://gamma-api.polymarket.com";

interface GammaMarket {
  id: string;
  question: string;
  description: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  volume24hr: string;
  liquidity: string;
  endDate: string;
  closed: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
  spread?: number;
  slug?: string;
  conditionId?: string;
}

// Calculate market statistics for relative scoring
function calculateStats(markets: { volume24h: number; liquidity: number }[]) {
  const volumes = markets.map((m: any) => m.volume24h).filter((v: any) => v > 0).sort((a: any, b: any) => a - b);
  const liquidities = markets.map((m: any) => m.liquidity).filter((l: any) => l > 0).sort((a: any, b: any) => a - b);
  
  const median = (arr: number[]) => arr.length ? arr[Math.floor(arr.length / 2)] : 0;
  const percentile = (arr: number[], p: number) => arr.length ? arr[Math.floor(arr.length * p)] : 0;
  
  return {
    medianVolume: median(volumes),
    p75Volume: percentile(volumes, 0.75),
    p90Volume: percentile(volumes, 0.90),
    medianLiquidity: median(liquidities),
    p75Liquidity: percentile(liquidities, 0.75),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "200");
  
  try {
    // Fetch markets from Polymarket
    const res = await fetch(`${GAMMA_API}/markets?limit=${limit}&active=true&closed=false`, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const rawMarkets: GammaMarket[] = await res.json();
    
    // First pass: parse basic data
    const parsedMarkets = rawMarkets
      .filter((m: any) => m.active && !m.closed)
      .map((m: any) => {
        let yesPrice = 0.5;
        let noPrice = 0.5;
        try {
          const prices = JSON.parse(m.outcomePrices || "[]");
          if (prices.length >= 2) {
            yesPrice = parseFloat(prices[0]) || 0.5;
            noPrice = parseFloat(prices[1]) || 0.5;
          }
        } catch {}

        const volume24h = parseFloat(m.volume24hr) || 0;
        const liquidity = parseFloat(m.liquidity) || 0;
        const endDate = m.endDate ? new Date(m.endDate) : null;
        const daysToEnd = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        
        return {
          id: m.id,
          slug: m.slug || m.id,
          conditionId: m.conditionId || m.id,
          question: m.question,
          description: m.description?.slice(0, 200) || "",
          category: m.category || "Other",
          yesPrice,
          noPrice,
          volume24h,
          liquidity,
          endDate,
          daysToEnd,
          updatedAt: m.updatedAt,
        };
      })
      // CRITICAL: Filter out expired and resolved markets
      .filter((m: any) => {
        // Exclude expired markets (negative days)
        if (m.daysToEnd !== null && m.daysToEnd < 0) return false;
        // Exclude essentially resolved markets (price < 5¢ or > 95¢)
        if (m.yesPrice < 0.05 || m.yesPrice > 0.95) return false;
        // Exclude zero liquidity markets
        if (m.liquidity < 100) return false;
        return true;
      });
    
    // Calculate relative stats for scoring
    const stats = calculateStats(parsedMarkets);
    
    // Second pass: score markets
    const markets = parsedMarkets.map((m: any) => {
      const { yesPrice, noPrice, volume24h, liquidity, daysToEnd } = m;
      
      // ===== TRADEABLE EDGE CALCULATION =====
      // The "edge" is the potential profit if you're right
      // Markets in the 20-40¢ range (YES underpriced) or 60-80¢ range (NO underpriced) are interesting
      // Markets at extreme prices (< 10¢ or > 90¢) have tiny edge potential
      
      const distanceFrom50 = Math.abs(yesPrice - 0.5);
      
      // Sweet spot: 15-40¢ or 60-85¢ (mispriced but not resolved)
      let edgeScore = 0;
      if (yesPrice >= 0.15 && yesPrice <= 0.40) {
        // Potential YES opportunity - cheaper = more upside
        edgeScore = (0.40 - yesPrice) / 0.25; // 0 to 1 scale
      } else if (yesPrice >= 0.60 && yesPrice <= 0.85) {
        // Potential NO opportunity - higher YES = cheaper NO
        edgeScore = (yesPrice - 0.60) / 0.25; // 0 to 1 scale
      } else if (yesPrice > 0.40 && yesPrice < 0.60) {
        // Near 50% - true toss-up, edge comes from information
        edgeScore = 0.3; // Modest baseline
      } else {
        // 5-15¢ or 85-95¢ - very low edge potential
        edgeScore = 0.1;
      }
      
      // ===== VOLUME SCORING (relative to market) =====
      let volumeScore = 0;
      if (volume24h >= stats.p90Volume) volumeScore = 3;
      else if (volume24h >= stats.p75Volume) volumeScore = 2;
      else if (volume24h >= stats.medianVolume) volumeScore = 1;
      
      // ===== LIQUIDITY SCORING =====
      let liquidityScore = 0;
      if (liquidity >= stats.p75Liquidity) liquidityScore = 2;
      else if (liquidity >= stats.medianLiquidity) liquidityScore = 1;
      else if (liquidity < 1000) liquidityScore = -1; // Penalty for thin markets
      
      // ===== DEADLINE SCORING =====
      let deadlineScore = 0;
      let deadlineUrgency = "none";
      if (daysToEnd !== null) {
        if (daysToEnd <= 3) {
          deadlineScore = 2;
          deadlineUrgency = "critical";
        } else if (daysToEnd <= 7) {
          deadlineScore = 1.5;
          deadlineUrgency = "high";
        } else if (daysToEnd <= 14) {
          deadlineScore = 1;
          deadlineUrgency = "medium";
        } else if (daysToEnd <= 30) {
          deadlineScore = 0.5;
          deadlineUrgency = "low";
        }
      }
      
      // ===== COMPOSITE SCORE (0-100) =====
      // Weight: Edge potential (40%) + Volume (25%) + Liquidity (20%) + Deadline (15%)
      const compositeScore = Math.round(
        edgeScore * 40 +           // 0-40 points
        volumeScore * 8.33 +       // 0-25 points  
        (liquidityScore + 1) * 6.67 + // 0-20 points (shifted so 0 liquidity = ~7 pts)
        deadlineScore * 7.5        // 0-15 points
      );
      
      // ===== TIER ASSIGNMENT =====
      let tier: "S" | "A" | "B" | "C" | "D" = "D";
      if (compositeScore >= 70 && volumeScore >= 2 && liquidityScore >= 1) tier = "S";
      else if (compositeScore >= 55 && volumeScore >= 1) tier = "A";
      else if (compositeScore >= 40) tier = "B";
      else if (compositeScore >= 25) tier = "C";
      
      // ===== PRIMARY SIGNAL DETECTION =====
      let primarySignal: { type: string; direction: string } | null = null;
      
      // Volume spike: Top 10% volume is notable
      if (volumeScore >= 3) {
        primarySignal = { type: "volume-spike", direction: "HIGH ACTIVITY" };
      }
      // Deadline catalyst: Approaching deadline with decent edge
      else if (deadlineScore >= 1.5 && edgeScore >= 0.3) {
        primarySignal = { type: "deadline-catalyst", direction: deadlineUrgency.toUpperCase() };
      }
      // Mispriced odds: Strong edge signal
      else if (edgeScore >= 0.6) {
        primarySignal = { 
          type: "mispriced-odds", 
          direction: yesPrice < 0.5 ? "YES UNDERPRICED" : "NO UNDERPRICED" 
        };
      }
      // Liquidity opportunity: Good liquidity with decent setup
      else if (liquidityScore >= 2 && edgeScore >= 0.4) {
        primarySignal = { type: "liquidity-opportunity", direction: "DEEP BOOK" };
      }
      
      // ===== KELLY CRITERION =====
      // f* = (bp - q) / b where b = odds, p = estimated probability, q = 1-p
      // Simplified: if we think true prob differs from market by "edge", kelly ≈ edge / (1 - edge)
      // We'll use a conservative 1/4 Kelly
      const impliedEdge = edgeScore * 0.15; // Max ~15% edge assumption
      const kellyFraction = Math.min(impliedEdge * 0.25, 0.10); // Max 10% of bankroll
      
      // ===== TRADE DIRECTION =====
      const edgeDirection = yesPrice < 0.5 ? "LONG YES" : "LONG NO";
      
      return {
        id: m.id,
        slug: m.slug,
        conditionId: m.conditionId,
        title: m.question,
        description: m.description,
        category: m.category,
        yesPrice,
        noPrice,
        volume24h,
        liquidity,
        endDate: m.endDate?.toISOString() || null,
        daysToEnd,
        edge: edgeScore,
        edgeDirection,
        compositeScore,
        tier,
        primarySignal,
        kellyFraction,
        volumeZScore: volumeScore,
        liquidityScore,
        deadlineUrgency,
        updatedAt: m.updatedAt,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);

    // Stats
    const overallStats = {
      totalMarkets: markets.length,
      activeMarkets: markets.length,
      byDateMarkets: markets.filter((m: any) => m.endDate).length,
      avgVolume: markets.reduce((s, m) => s + m.volume24h, 0) / (markets.length || 1),
      avgLiquidity: markets.reduce((s, m) => s + m.liquidity, 0) / (markets.length || 1),
      tierCounts: {
        S: markets.filter((m: any) => m.tier === "S").length,
        A: markets.filter((m: any) => m.tier === "A").length,
        B: markets.filter((m: any) => m.tier === "B").length,
        C: markets.filter((m: any) => m.tier === "C").length,
        D: markets.filter((m: any) => m.tier === "D").length,
      },
    };

    // Top opportunities (S and A tier with actual signals)
    const opportunities = markets
      .filter(m => (m.tier === "S" || m.tier === "A") && m.primarySignal)
      .slice(0, 15);
    
    // Top movers (highest volume with real activity)
    const movers = [...markets]
      .filter(m => m.volume24h > 0)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 10)
      .map(m => ({
        ...m,
        volumeRank: markets.filter(x => x.volume24h > m.volume24h).length + 1,
      }));
    
    // Deadline markets (actually upcoming, not expired)
    const deadlines = markets
      .filter(m => m.daysToEnd !== null && m.daysToEnd > 0 && m.daysToEnd <= 60)
      .sort((a, b) => (a.daysToEnd ?? 999) - (b.daysToEnd ?? 999))
      .slice(0, 10);

    // Categories
    const categoryCount: Record<string, number> = {};
    markets.forEach(m => {
      categoryCount[m.category] = (categoryCount[m.category] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({
      stats: overallStats,
      opportunities,
      movers,
      deadlines,
      topCategories,
      markets: markets.slice(0, 100),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Live API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch live data", details: String(error) },
      { status: 500 }
    );
  }
}
