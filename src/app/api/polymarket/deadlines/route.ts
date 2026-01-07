/**
 * Deadline Markets API Route
 * Lists markets with upcoming deadlines
 * GET /api/polymarket/deadlines
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { timeRemainingDays, deadlineUrgency } from "@/lib/polymarket/deadline";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxDays = parseInt(searchParams.get("maxDays") || "90");
    const urgency = searchParams.get("urgency"); // critical, urgent, moderate

    const now = new Date();
    const futureDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const markets = await prisma.market.findMany({
      where: {
        active: true,
        isDeadline: true,
        endDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { endDate: "asc" },
    });

    const withDeadlines = markets.map((market: any) => {
      const daysRemaining = timeRemainingDays(market.endDate);
      const urgencyLevel = deadlineUrgency(daysRemaining);
      const snapshot = market.snapshots[0];

      return {
        id: market.id,
        title: market.title,
        endDate: market.endDate,
        daysRemaining,
        urgency: urgencyLevel,
        category: market.category,
        yesPrice: snapshot?.yesPrice,
        liquidity: snapshot?.liquidity,
        volume24h: snapshot?.volume24h,
      };
    });

    const filtered = urgency
      ? withDeadlines.filter(m => m.urgency === urgency)
      : withDeadlines;

    return NextResponse.json({
      deadlines: filtered,
      total: filtered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Deadlines fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
