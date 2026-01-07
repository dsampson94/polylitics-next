/**
 * Market Ingestion API Route
 * Fetches markets from Polymarket API and stores in database
 * POST /api/polymarket/ingest
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PolymarketClient } from "@/lib/polymarket/client";
import { looksLikeByDateMarket, extractDeadline } from "@/lib/polymarket/deadline";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.POLYMARKET_API_URL || "https://gamma-api.polymarket.com";
    const client = new PolymarketClient(baseUrl);

    // Fetch all active markets
    const markets = await client.listMarkets({ active: true, limit: 200 });

    let ingested = 0;
    let skipped = 0;

    // Upsert markets into database
    for (const market of markets) {
      try {
        const isByDate = looksLikeByDateMarket(
          market.title,
          market.rules,
          market.description
        );

        const deadline = extractDeadline(
          market.title,
          market.rules,
          market.endDate ? new Date(market.endDate) : null
        );

        await prisma.market.upsert({
          where: { id: market.id },
          update: {
            title: market.title,
            description: market.description ?? null,
            rules: market.rules ?? null,
            category: market.category ?? null,
            endDate: market.endDate ? new Date(market.endDate) : deadline,
            active: market.active ?? true,
            closed: market.closed ?? false,
            isByDate,
            isDeadline: isByDate && deadline !== null,
            updatedAt: new Date(),
          },
          create: {
            id: market.id,
            conditionId: market.conditionId ?? null,
            slug: market.slug ?? null,
            title: market.title,
            description: market.description ?? null,
            rules: market.rules ?? null,
            category: market.category ?? null,
            endDate: market.endDate ? new Date(market.endDate) : deadline,
            active: market.active ?? true,
            closed: market.closed ?? false,
            isByDate,
            isDeadline: isByDate && deadline !== null,
          },
        });

        ingested++;
      } catch (error) {
        console.error(`Failed to ingest market ${market.id}:`, error);
        skipped++;
      }
    }

    // Now fetch and store price snapshots for active markets
    const activeMarketIds = markets
      .filter(m => m.active !== false)
      .map(m => m.id)
      .slice(0, 100);

    const prices = await client.getPrices(activeMarketIds);

    let snapshotsCreated = 0;

    for (const price of prices) {
      try {
        // Calculate price changes if we have history
        const recentSnapshots = await prisma.marketSnapshot.findMany({
          where: { marketId: price.marketId },
          orderBy: { capturedAt: "desc" },
          take: 24,
        });

        let priceChange1h = null;
        let priceChange24h = null;

        if (recentSnapshots.length > 0 && price.yesPrice !== null) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

          const snapshot1h = recentSnapshots.find(
            s => s.capturedAt <= oneHourAgo && s.yesPrice !== null
          );
          const snapshot24h = recentSnapshots.find(
            s => s.capturedAt <= oneDayAgo && s.yesPrice !== null
          );

          if (snapshot1h && snapshot1h.yesPrice && price.yesPrice !== null && price.yesPrice !== undefined) {
            priceChange1h = price.yesPrice - snapshot1h.yesPrice;
          }
          if (snapshot24h && snapshot24h.yesPrice && price.yesPrice !== null && price.yesPrice !== undefined) {
            priceChange24h = price.yesPrice - snapshot24h.yesPrice;
          }
        }

        await prisma.marketSnapshot.create({
          data: {
            marketId: price.marketId,
            yesPrice: price.yesPrice ?? null,
            noPrice: price.noPrice ?? null,
            volume24h: price.volume24h ?? null,
            liquidity: price.liquidity ?? null,
            priceChange1h,
            priceChange24h,
          },
        });

        snapshotsCreated++;
      } catch (error) {
        console.error(`Failed to create snapshot for market ${price.marketId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      marketsIngested: ingested,
      marketsSkipped: skipped,
      snapshotsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
