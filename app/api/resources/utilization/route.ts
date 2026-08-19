import { NextResponse } from "next/server";

import { getResourceUtilizationData } from "../../../../lib/resource-intelligence";

export async function GET() {
  try {
    const resourceUtilization = await getResourceUtilizationData();

    return NextResponse.json({
      success: true,
      data: resourceUtilization.records,
      latest: resourceUtilization.latest,
      summary: resourceUtilization.summary,
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
