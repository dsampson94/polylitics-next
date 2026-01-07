/**
 * Advanced Opportunities API
 * Full-featured opportunity detection with multi-signal analysis
 * GET /api/polymarket/opportunities
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { scoreMarketAdvanced, AdvancedScore } from "@/lib/polymarket/advanced-scoring";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minScore = parseInt(searchParams.get("minScore") || "40");
    const tier = searchParams.get("tier"); // S, A, B, C, D
    const signal = searchParams.get("signal"); // deadline-overpriced, momentum-entry, etc
    const direction = searchParams.get("direction"); // YES, NO
    const limit = parseInt(searchParams.get("limit") || "50");
    const category = searchParams.get("category");

    // Fetch active markets with snapshots
    const whereClause: any = { active: true };
    if (category) whereClause.category = category;

    const markets = await prisma.market.findMany({
      where: whereClause,
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 30,
        },
      },
      take: 500,
    });

    // Score all markets
    const scored: AdvancedScore[] = [];
    
    for (const market of markets) {
      const score = scoreMarketAdvanced({
        id: market.id,
        title: market.title,
        description: market.description,
        rules: market.rules,
        category: market.category,
        endDate: market.endDate,
        snapshots: market.snapshots.map(s => ({
          capturedAt: s.capturedAt,
          yesPrice: s.yesPrice,
          noPrice: s.noPrice,
          volume24h: s.volume24h,
          liquidity: s.liquidity,
          priceChange1h: s.priceChange1h,
          priceChange24h: s.priceChange24h,
        })),
      });
      
      if (score) scored.push(score);
    }

    // Apply filters
    let filtered = scored.filter(s => s.compositeScore >= minScore);
    
    if (tier) {
      filtered = filtered.filter(s => s.tier === tier);
    }
    
    if (signal) {
      filtered = filtered.filter(s => s.signals.some(sig => sig.type === signal));
    }
    
    if (direction) {
      filtered = filtered.filter(s => s.edgeDirection === direction || s.primarySignal?.direction === direction);
    }

    // Sort by composite score
    const ranked = filtered
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, limit);

    // Generate summary stats
    const tierCounts = {
      S: scored.filter(s => s.tier === "S").length,
      A: scored.filter(s => s.tier === "A").length,
      B: scored.filter(s => s.tier === "B").length,
      C: scored.filter(s => s.tier === "C").length,
      D: scored.filter(s => s.tier === "D").length,
    };

    const signalCounts = {
      "deadline-overpriced": scored.filter(s => s.signals.some(sig => sig.type === "deadline-overpriced")).length,
      "momentum-entry": scored.filter(s => s.signals.some(sig => sig.type === "momentum-entry")).length,
      "attention-arbitrage": scored.filter(s => s.signals.some(sig => sig.type === "attention-arbitrage")).length,
      "volume-precursor": scored.filter(s => s.signals.some(sig => sig.type === "volume-precursor")).length,
      "mean-reversion": scored.filter(s => s.signals.some(sig => sig.type === "mean-reversion")).length,
    };

    return NextResponse.json({
      opportunities: ranked,
      summary: {
        totalScored: scored.length,
        filtered: filtered.length,
        tierCounts,
        signalCounts,
        avgCompositeScore: scored.length > 0 
          ? (scored.reduce((sum, s) => sum + s.compositeScore, 0) / scored.length).toFixed(1)
          : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Opportunities error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
