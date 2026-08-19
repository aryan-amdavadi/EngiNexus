import { NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const equipment = await prisma.equipment.findMany({
      orderBy: { name: "asc" },
    });

    const availabilityRecords = await prisma.resourceAvailability.findMany({
      where: { resourceType: "EQUIPMENT" },
    });

    const availabilityMap = new Map(
      availabilityRecords.map((entry) => [entry.resourceId, entry]),
    );

    return NextResponse.json({
      success: true,
      data: equipment.map((item) => {
        const availability = availabilityMap.get(item.id);
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          location: item.location,
          utilizationRate: item.utilizationRate,
          status: availability?.status ?? item.status,
          availability: availability?.availableUnits ?? item.availability,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to fetch equipment:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch equipment records.",
      },
      { status: 500 },
    );
  }
}
