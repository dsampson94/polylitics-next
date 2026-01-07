/**
 * Watchlist API Routes
 * GET - List watchlists
 * POST - Create watchlist or add item
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const watchlists = await prisma.watchlist.findMany({
      include: {
        items: {
          include: {
            market: {
              include: {
                snapshots: {
                  orderBy: { capturedAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Calculate P&L for each item
    const enriched = watchlists.map(wl => ({
      ...wl,
      items: wl.items.map(item => {
        const currentPrice = item.market.snapshots[0]?.yesPrice ?? 0;
        const entryPrice = item.entryPrice ?? 0;
        const pnl = entryPrice > 0 ? currentPrice - entryPrice : 0;
        const pnlPct = entryPrice > 0 ? (pnl / entryPrice) * 100 : 0;
        
        return {
          ...item,
          currentPrice,
          pnl,
          pnlPct,
          atTarget: item.targetPrice ? currentPrice >= item.targetPrice : false,
          atStop: item.stopPrice ? currentPrice <= item.stopPrice : false,
        };
      }),
    }));

    return NextResponse.json({ watchlists: enriched });
  } catch (error) {
    console.error("Watchlist fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Create new watchlist
    if (body.action === "create-watchlist") {
      const watchlist = await prisma.watchlist.create({
        data: {
          name: body.name,
          description: body.description,
        },
      });
      return NextResponse.json({ watchlist });
    }
    
    // Add item to watchlist
    if (body.action === "add-item") {
      const item = await prisma.watchlistItem.create({
        data: {
          watchlistId: body.watchlistId,
          marketId: body.marketId,
          notes: body.notes,
          entryPrice: body.entryPrice,
          entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
          targetPrice: body.targetPrice,
          stopPrice: body.stopPrice,
        },
      });
      return NextResponse.json({ item });
    }
    
    // Update item
    if (body.action === "update-item") {
      const item = await prisma.watchlistItem.update({
        where: { id: body.itemId },
        data: {
          notes: body.notes,
          entryPrice: body.entryPrice,
          targetPrice: body.targetPrice,
          stopPrice: body.stopPrice,
        },
      });
      return NextResponse.json({ item });
    }
    
    // Remove item
    if (body.action === "remove-item") {
      await prisma.watchlistItem.delete({
        where: { id: body.itemId },
      });
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Watchlist action error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
