/**
 * Alerts API Routes
 * GET - List alerts
 * POST - Create/update alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active") !== "false";
    const triggered = searchParams.get("triggered");

    const where: any = {};
    if (active) where.active = true;
    if (triggered !== null) where.triggered = triggered === "true";

    const alerts = await prisma.alert.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Alerts fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "create") {
      const alert = await prisma.alert.create({
        data: {
          marketId: body.marketId,
          alertType: body.alertType,
          message: body.message,
          priceThreshold: body.priceThreshold,
          volumeThreshold: body.volumeThreshold,
          edgeThreshold: body.edgeThreshold,
        },
      });
      return NextResponse.json({ alert });
    }

    if (body.action === "delete") {
      await prisma.alert.delete({
        where: { id: body.alertId },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "toggle") {
      const alert = await prisma.alert.update({
        where: { id: body.alertId },
        data: { active: body.active },
      });
      return NextResponse.json({ alert });
    }

    // Check alerts - call this periodically
    if (body.action === "check") {
      const activeAlerts = await prisma.alert.findMany({
        where: { active: true, triggered: false },
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
      });

      const triggered: string[] = [];

      for (const alert of activeAlerts) {
        const snapshot = alert.market.snapshots[0];
        if (!snapshot) continue;

        let shouldTrigger = false;

        // Price threshold check
        if (alert.priceThreshold !== null && snapshot.yesPrice !== null) {
          if (alert.alertType === "PRICE_SPIKE" && snapshot.yesPrice >= alert.priceThreshold) {
            shouldTrigger = true;
          }
        }

        // Volume spike check
        if (alert.alertType === "VOLUME_SPIKE" && snapshot.volumeSpike !== null) {
          if (alert.volumeThreshold !== null && snapshot.volumeSpike >= alert.volumeThreshold) {
            shouldTrigger = true;
          }
        }

        // Deadline approaching (within 7 days)
        if (alert.alertType === "DEADLINE_APPROACHING" && alert.market.endDate) {
          const daysRemaining = (alert.market.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysRemaining <= 7 && daysRemaining > 0) {
            shouldTrigger = true;
          }
        }

        if (shouldTrigger) {
          await prisma.alert.update({
            where: { id: alert.id },
            data: { triggered: true, triggeredAt: new Date() },
          });
          triggered.push(alert.id);
        }
      }

      return NextResponse.json({ checked: activeAlerts.length, triggered });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Alert action error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
