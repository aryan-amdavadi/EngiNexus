import { NextResponse } from "next/server";

import { detectResourceBottlenecks } from "../../../../lib/resource-intelligence";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const thresholdParam = searchParams.get("threshold");
    const thresholdValue = thresholdParam ? Number(thresholdParam) : 80;

    if (Number.isNaN(thresholdValue) || thresholdValue < 1 || thresholdValue > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Threshold must be a number between 1 and 100.",
        },
        { status: 400 },
      );
    }

    const bottlenecks = await detectResourceBottlenecks(thresholdValue);

    return NextResponse.json({
      success: true,
      threshold: thresholdValue,
      data: bottlenecks,
    });
  } catch (error) {
    console.error("Failed to detect resource bottlenecks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to detect resource bottlenecks.",
      },
      { status: 500 },
    );
  }
}
