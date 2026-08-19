import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const resourceUtilization = await prisma.resourceUtilization.findMany({
      orderBy: { loggedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: resourceUtilization.map((entry) => ({
        id: entry.id,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        resourceName: entry.resourceName,
        period: entry.period,
        utilizationRate: entry.utilizationRate,
        status: entry.status,
        loggedAt: entry.loggedAt,
      })),
    });
  } catch (error) {
    console.error("Failed to load utilization data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch resource utilization records.",
      },
      { status: 500 },
    );
  }
}
