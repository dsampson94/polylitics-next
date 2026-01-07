/**
 * Markets List API Route
 * GET /api/polymarket/markets
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const active = searchParams.get("active") === "true";
    const isByDate = searchParams.get("byDate") === "true";
    const category = searchParams.get("category");

    const where: any = {};
    
    if (active) where.active = true;
    if (isByDate) where.isByDate = true;
    if (category) where.category = category;

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        include: {
          snapshots: {
            orderBy: { capturedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.market.count({ where }),
    ]);

    return NextResponse.json({
      markets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Markets fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
