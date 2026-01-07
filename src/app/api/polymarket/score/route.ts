/**
 * Market Scoring API Route
 * Scores deadline markets for delay risk
 * GET /api/polymarket/score
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { scoreDeadlineMarket, rankByEdge, filterByEdge } from "@/lib/polymarket/scoring";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minEdge = parseFloat(searchParams.get("minEdge") || "0.03");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Fetch by-date markets with latest snapshot
    const markets = await prisma.market.findMany({
      where: {
        active: true,
        isByDate: true,
      },
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
      },
      take: 200,
    });

    const scored = markets
      .map((market: any) => {
        const snapshot = market.snapshots[0];
        return scoreDeadlineMarket({
          id: market.id,
          title: market.title,
          description: market.description,
          rules: market.rules,
          category: market.category,
          endDate: market.endDate,
          yesPrice: snapshot?.yesPrice ?? null,
          liquidity: snapshot?.liquidity ?? null,
        });
      })
      .filter((s: any): s is NonNullable<typeof s> => s !== null);

    const filtered = filterByEdge(scored, minEdge);
    const ranked = rankByEdge(filtered).slice(0, limit);

    // Store scores in database
    for (const score of ranked.slice(0, 20)) {
      try {
        await prisma.marketScore.create({
          data: {
            marketId: score.id,
            marketProb: score.marketProb,
            modelProb: score.modelProb,
            edge: score.edge,
            timeRemainingDays: score.timeRemainingDays,
            delayRisk: score.delayRisk,
            rationale: score.rationale,
          },
        });
      } catch (error) {
        // Ignore duplicate errors, just continue
      }
    }

    return NextResponse.json({
      scored: ranked,
      total: scored.length,
      filtered: filtered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scoring error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
