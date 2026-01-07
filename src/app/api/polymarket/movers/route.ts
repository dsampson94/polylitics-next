/**
 * Top Movers API Route
 * Detects markets with significant price/volume changes
 * GET /api/polymarket/movers
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { scoreMovingMarket, rankByAttention } from "@/lib/polymarket/scoring";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const minAttention = parseFloat(searchParams.get("minAttention") || "0.2");

    // Fetch active markets with recent snapshots
    const markets = await prisma.market.findMany({
      where: { active: true },
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 30, // Last 30 snapshots for analysis
        },
      },
      take: 200,
    });

    const scored = markets
      .map((market: any) => scoreMovingMarket(market))
      .filter((m: any): m is NonNullable<typeof m> => m !== null)
      .filter((m: any) => (m.attentionScore ?? 0) >= minAttention);

    const ranked = rankByAttention(scored).slice(0, limit);

    return NextResponse.json({
      movers: ranked,
      total: scored.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Movers detection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
