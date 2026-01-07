/**
 * Stats API Route
 * Dashboard statistics and overview
 * GET /api/polymarket/stats
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [
      totalMarkets,
      activeMarkets,
      byDateMarkets,
      deadlineMarkets,
      recentSnapshots,
      topCategories,
    ] = await Promise.all([
      prisma.market.count(),
      prisma.market.count({ where: { active: true } }),
      prisma.market.count({ where: { active: true, isByDate: true } }),
      prisma.market.count({ where: { active: true, isDeadline: true } }),
      prisma.marketSnapshot.count({
        where: {
          capturedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.market.groupBy({
        by: ["category"],
        where: { active: true },
        _count: true,
        orderBy: {
          _count: {
            category: "desc",
          },
        },
        take: 10,
      }),
    ]);

    // Recent high-edge opportunities
    const recentScores = await prisma.marketScore.findMany({
      where: {
        scoredAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: [{ edge: "desc" }],
      take: 5,
    });

    // Recent alerts
    const recentAlerts = await prisma.alert.findMany({
      where: {
        triggered: true,
        triggeredAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        market: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { triggeredAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalMarkets,
        activeMarkets,
        byDateMarkets,
        deadlineMarkets,
        recentSnapshots,
      },
      topCategories: topCategories.map(c => ({
        category: c.category || "Unknown",
        count: c._count,
      })),
      recentScores,
      recentAlerts: recentAlerts.map(a => ({
        id: a.id,
        type: a.alertType,
        message: a.message,
        marketTitle: a.market.title,
        triggeredAt: a.triggeredAt,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
