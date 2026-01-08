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

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GAMMA_API = "https://gamma-api.polymarket.com";

// Categories to fetch from Polymarket
const CATEGORIES = [
  "politics",
  "sports", 
  "crypto",
  "pop-culture",
  "business",
  "science",
  "world",
  "tech",
  "breaking",
];

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
  groupItemTitle?: string;
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
  const userLimit = parseInt(searchParams.get("limit") || "2000");
  
  // Category filtering - allow excluding categories
  const excludeCategories = searchParams.get("excludeCategories")?.split(",") || [];
  const includeCategories = searchParams.get("includeCategories")?.split(",") || [];
  
  try {
    // Fetch markets from ALL categories in parallel for maximum coverage
    const categoryPromises = CATEGORIES.map(async (category) => {
      try {
        const res = await fetch(
          `${GAMMA_API}/markets?closed=false&limit=500&tag=${category}`,
          {
            cache: "no-store",
            headers: { "Accept": "application/json" },
          }
        );
        if (!res.ok) return [];
        const markets: GammaMarket[] = await res.json();
        // Tag each market with its category
        return markets.map(m => ({ ...m, fetchedCategory: category }));
      } catch {
        return [];
      }
    });
    
    // Also fetch without category filter for general markets
    const generalPromise = (async () => {
      try {
        let allGeneral: GammaMarket[] = [];
        for (let offset = 0; offset < 2000; offset += 100) {
          const res = await fetch(
            `${GAMMA_API}/markets?closed=false&limit=100&offset=${offset}`,
            { cache: "no-store", headers: { "Accept": "application/json" } }
          );
          if (!res.ok) break;
          const batch: GammaMarket[] = await res.json();
          if (batch.length === 0) break;
          allGeneral = allGeneral.concat(batch);
          if (batch.length < 100) break;
        }
        return allGeneral;
      } catch {
        return [];
      }
    })();
    
    // Fetch events too for better grouping
    const eventsPromise = (async () => {
      try {
        const res = await fetch(
          `${GAMMA_API}/events?closed=false&limit=500`,
          { cache: "no-store", headers: { "Accept": "application/json" } }
        );
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    })();
    
    // Wait for all fetches
    const [categoryResults, generalMarkets, events] = await Promise.all([
      Promise.all(categoryPromises),
      generalPromise,
      eventsPromise,
    ]);
    
    // Combine all markets and dedupe by ID
    const allCategoryMarkets = categoryResults.flat();
    const marketMap = new Map<string, GammaMarket>();
    
    // Add general markets first
    generalMarkets.forEach((m: any) => marketMap.set(m.id, m));
    // Then category markets (will override with category info)
    allCategoryMarkets.forEach((m: any) => marketMap.set(m.id, m));
    
    const allRawMarkets = Array.from(marketMap.values());
    console.log(`Fetched ${allRawMarkets.length} unique markets (${generalMarkets.length} general + ${allCategoryMarkets.length} from categories)`);
    const rawMarkets = allRawMarkets;
    
    // Debug: Check how many markets pass each filter
    const activeCount = rawMarkets.filter((m: any) => !m.closed).length;
    console.log(`After closed filter: ${activeCount} markets`);
    
    // First pass: parse basic data - only filter out CLOSED markets
    const parsedMarkets = rawMarkets
      .filter((m: any) => !m.closed)
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
        
        // Determine category from tags, groupItemTitle, or fetched category
        let category = "Other";
        if (m.fetchedCategory) {
          category = m.fetchedCategory.charAt(0).toUpperCase() + m.fetchedCategory.slice(1);
        } else if (m.groupItemTitle) {
          // Parse category from title (e.g., "NBA", "NFL", "Crypto")
          const title = m.groupItemTitle.toLowerCase();
          if (title.includes("nba") || title.includes("nfl") || title.includes("nhl") || title.includes("mlb") || title.includes("soccer") || title.includes("football") || title.includes("super bowl")) {
            category = "Sports";
          } else if (title.includes("bitcoin") || title.includes("ethereum") || title.includes("crypto")) {
            category = "Crypto";
          } else if (title.includes("trump") || title.includes("biden") || title.includes("election") || title.includes("president")) {
            category = "Politics";
          }
        } else if (m.tags && m.tags.length > 0) {
          category = m.tags[0].charAt(0).toUpperCase() + m.tags[0].slice(1);
        }
        
        // Also try to infer from question text
        const q = (m.question || "").toLowerCase();
        if (category === "Other") {
          if (q.includes("nba") || q.includes("nfl") || q.includes("nhl") || q.includes("super bowl") || q.includes("world cup") || q.includes("championship")) {
            category = "Sports";
          } else if (q.includes("bitcoin") || q.includes("ethereum") || q.includes("btc") || q.includes("eth") || q.includes("crypto")) {
            category = "Crypto";
          } else if (q.includes("trump") || q.includes("biden") || q.includes("election") || q.includes("president") || q.includes("congress") || q.includes("fed ")) {
            category = "Politics";
          } else if (q.includes("ukraine") || q.includes("russia") || q.includes("china") || q.includes("israel") || q.includes("iran")) {
            category = "World";
          } else if (q.includes("ai") || q.includes("gpt") || q.includes("gemini") || q.includes("openai")) {
            category = "Tech";
          } else if (q.includes("weather") || q.includes("temperature") || q.includes("climate")) {
            category = "Science";
          }
        }
        
        return {
          id: m.id,
          slug: m.slug || m.id,
          conditionId: m.conditionId || m.id,
          question: m.question,
          title: m.question, // Alias for compatibility
          description: m.description?.slice(0, 200) || "",
          category,
          yesPrice,
          noPrice,
          volume24h,
          liquidity,
          endDate,
          daysToEnd,
          updatedAt: m.updatedAt,
        };
      })
      // CRITICAL: Filter out expired and resolved markets - be VERY permissive
      .filter((m: any) => {
        // Exclude expired markets (negative days)
        if (m.daysToEnd !== null && m.daysToEnd < -7) return false;
        // Keep ALL price ranges - let the scoring handle it
        // Only exclude zero liquidity
        if (m.liquidity <= 0) return false;
        return true;
      });
    
    console.log(`After filtering: ${parsedMarkets.length} markets`);
    
    // Calculate relative stats for scoring
    const stats = calculateStats(parsedMarkets);
    
    // Second pass: score markets for REAL money-making opportunities
    const markets = parsedMarkets.map((m: any) => {
      const { yesPrice, noPrice, volume24h, liquidity, daysToEnd, category, question } = m;
      
      // ===== SKIP ESSENTIALLY RESOLVED MARKETS =====
      // Markets at <5% or >95% are done - no opportunity
      const isResolved = yesPrice < 0.05 || yesPrice > 0.95;
      
      // ===== VOLUME IS KING =====
      // High volume = can actually trade, price discovery is real
      // $100K+ volume = serious opportunity
      let volumeScore = 0;
      if (volume24h >= 1000000) volumeScore = 5;      // $1M+ = S-tier volume
      else if (volume24h >= 500000) volumeScore = 4;   // $500K+
      else if (volume24h >= 100000) volumeScore = 3;   // $100K+ = tradeable
      else if (volume24h >= 50000) volumeScore = 2;    // $50K+ = decent
      else if (volume24h >= 10000) volumeScore = 1;    // $10K+ = minimum
      
      // ===== PRICE OPPORTUNITY ZONES =====
      // Best opportunities: NOT near 0/100, NOT exactly 50/50
      // Sweet spots: 10-35% (buy YES cheap) or 65-90% (buy NO cheap)
      let edgeScore = 0;
      let edgeDirection = "HOLD";
      
      if (!isResolved) {
        if (yesPrice >= 0.10 && yesPrice <= 0.35) {
          // Underdog YES - high upside if it hits
          edgeScore = 2 + (0.35 - yesPrice) * 5; // More edge the cheaper it is
          edgeDirection = "BUY YES";
        } else if (yesPrice >= 0.65 && yesPrice <= 0.90) {
          // Favorite at risk - good NO opportunity
          edgeScore = 2 + (yesPrice - 0.65) * 5;
          edgeDirection = "BUY NO";
        } else if (yesPrice >= 0.35 && yesPrice <= 0.65) {
          // Toss-up - edge depends on your analysis
          edgeScore = 1.5;
          edgeDirection = "ANALYZE";
        } else {
          // 5-10% or 90-95% - small edge
          edgeScore = 0.5;
          edgeDirection = yesPrice < 0.5 ? "RISKY YES" : "RISKY NO";
        }
      }
      
      // ===== CATEGORY BOOST =====
      // Geopolitics, Politics, Crypto = news-driven = volatile = opportunity
      let categoryBoost = 0;
      const hotCategories = ["Politics", "World", "Crypto", "Geopolitics", "Finance"];
      if (hotCategories.includes(category)) {
        categoryBoost = 1;
      }
      // Extra boost for trending topics
      const q = (question || "").toLowerCase();
      const trendingTopics = ["trump", "iran", "venezuela", "ukraine", "bitcoin", "ethereum", "fed", "greenland", "china", "israel"];
      if (trendingTopics.some(topic => q.includes(topic))) {
        categoryBoost += 1;
      }
      
      // ===== LIQUIDITY CHECK =====
      // Need liquidity to actually trade
      let liquidityScore = 0;
      if (liquidity >= 100000) liquidityScore = 2;
      else if (liquidity >= 10000) liquidityScore = 1;
      else if (liquidity < 1000) liquidityScore = -1;
      
      // ===== DEADLINE OPPORTUNITY =====
      let deadlineScore = 0;
      let deadlineUrgency = "none";
      if (daysToEnd !== null && daysToEnd > 0) {
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
      // VOLUME is most important (50%), then edge (25%), category/news (15%), liquidity (10%)
      let compositeScore = 0;
      if (!isResolved) {
        compositeScore = Math.round(
          volumeScore * 10 +           // 0-50 points (volume is KING)
          edgeScore * 6 +              // 0-25 points
          categoryBoost * 7.5 +        // 0-15 points for hot categories
          (liquidityScore + 1) * 3.33 + // 0-10 points
          deadlineScore * 2.5          // 0-5 points bonus
        );
      }
      
      // ===== TIER ASSIGNMENT =====
      let tier: "S" | "A" | "B" | "C" | "D" = "D";
      if (compositeScore >= 60 && volumeScore >= 3) tier = "S";  // High score + high volume
      else if (compositeScore >= 45 && volumeScore >= 2) tier = "A";
      else if (compositeScore >= 30 && volumeScore >= 1) tier = "B";
      else if (compositeScore >= 15) tier = "C";
      
      // ===== PRIMARY SIGNAL DETECTION =====
      let primarySignal: { type: string; direction: string } | null = null;
      
      // High volume hot market
      if (volumeScore >= 4 && categoryBoost >= 1) {
        primarySignal = { type: "hot-market", direction: "HIGH VOLUME + NEWS" };
      }
      // Volume spike
      else if (volumeScore >= 3) {
        primarySignal = { type: "volume-spike", direction: `$${Math.round(volume24h/1000)}K VOL` };
      }
      // News-driven catalyst
      else if (categoryBoost >= 2) {
        primarySignal = { type: "news-catalyst", direction: "TRENDING" };
      }
      // Deadline opportunity
      else if (deadlineScore >= 1.5 && !isResolved) {
        primarySignal = { type: "deadline-play", direction: `${daysToEnd}D LEFT` };
      }
      // Mispriced odds
      else if (edgeScore >= 2.5 && !isResolved) {
        primarySignal = { type: "mispriced", direction: edgeDirection };
      }
      
      // ===== KELLY CRITERION =====
      // f* = (bp - q) / b where b = odds, p = estimated probability, q = 1-p
      // Simplified: if we think true prob differs from market by "edge", kelly ≈ edge / (1 - edge)
      // We'll use a conservative 1/4 Kelly
      const impliedEdge = edgeScore * 0.15; // Max ~15% edge assumption
      const kellyFraction = Math.min(impliedEdge * 0.25, 0.10); // Max 10% of bankroll
      
      // ===== FINAL TRADE DIRECTION =====
      const finalEdgeDirection = edgeDirection; // Use the one already calculated
      
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
        edgeDirection: finalEdgeDirection,
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
    
    // Apply category filtering
    let filteredMarkets = markets;
    if (excludeCategories.length > 0) {
      filteredMarkets = filteredMarkets.filter(m => 
        !excludeCategories.some(cat => m.category.toLowerCase().includes(cat.toLowerCase()))
      );
    }
    if (includeCategories.length > 0) {
      filteredMarkets = filteredMarkets.filter(m => 
        includeCategories.some(cat => m.category.toLowerCase().includes(cat.toLowerCase()))
      );
    }

    // Stats (use filtered markets)
    const overallStats = {
      totalMarkets: filteredMarkets.length,
      activeMarkets: filteredMarkets.length,
      byDateMarkets: filteredMarkets.filter((m: any) => m.endDate).length,
      avgVolume: filteredMarkets.reduce((s, m) => s + m.volume24h, 0) / (filteredMarkets.length || 1),
      avgLiquidity: filteredMarkets.reduce((s, m) => s + m.liquidity, 0) / (filteredMarkets.length || 1),
      tierCounts: {
        S: filteredMarkets.filter((m: any) => m.tier === "S").length,
        A: filteredMarkets.filter((m: any) => m.tier === "A").length,
        B: filteredMarkets.filter((m: any) => m.tier === "B").length,
        C: filteredMarkets.filter((m: any) => m.tier === "C").length,
        D: filteredMarkets.filter((m: any) => m.tier === "D").length,
      },
    };

    // Top opportunities - REAL money-making potential
    // Prioritize: high volume, tradeable price range, hot categories
    const opportunities = filteredMarkets
      .filter(m => {
        // Must have decent volume to actually trade
        if (m.volume24h < 10000) return false;
        // Must not be essentially resolved
        if (m.yesPrice < 0.05 || m.yesPrice > 0.95) return false;
        // Must have a signal or be high tier
        return m.tier === "S" || m.tier === "A" || (m.tier === "B" && m.primarySignal);
      })
      .slice(0, 50);
    
    // Top movers (highest volume - these are where the action is)
    const movers = [...filteredMarkets]
      .filter(m => m.volume24h > 0 && m.yesPrice >= 0.05 && m.yesPrice <= 0.95) // Not resolved
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 30)
      .map(m => ({
        ...m,
        volumeRank: filteredMarkets.filter(x => x.volume24h > m.volume24h).length + 1,
      }));
    
    // Deadline markets (tradeable, not resolved)
    const deadlines = filteredMarkets
      .filter(m => m.daysToEnd !== null && m.daysToEnd > 0 && m.daysToEnd <= 90 && m.yesPrice >= 0.05 && m.yesPrice <= 0.95)
      .sort((a, b) => (a.daysToEnd ?? 999) - (b.daysToEnd ?? 999))
      .slice(0, 30);

    // Categories (use all markets for category counts)
    const categoryCount: Record<string, number> = {};
    filteredMarkets.forEach(m => {
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
      markets: filteredMarkets.slice(0, 500), // Return filtered markets
      allCategories: Object.keys(categoryCount), // Return all available categories for filtering
      fetchedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("Live API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch live data", details: String(error) },
      { status: 500 }
    );
  }
}
