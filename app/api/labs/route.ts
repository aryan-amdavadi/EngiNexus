import { NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const labs = await prisma.laboratory.findMany({
      include: {
        department: true,
        equipment: {
          include: { equipment: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: labs.map((lab) => ({
        id: lab.id,
        name: lab.name,
        department: lab.department.name,
        capacity: lab.capacity,
        utilizationRate: lab.utilizationRate,
        status: lab.status,
        capabilities: lab.capabilities ? JSON.parse(lab.capabilities) : [],
        equipment: lab.equipment.map((entry) => ({
          id: entry.equipment.id,
          name: entry.equipment.name,
          quantity: entry.quantity,
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch labs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch laboratory records.",
      },
      { status: 500 },
    );
  }
}
