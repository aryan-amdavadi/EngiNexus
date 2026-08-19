import { NextResponse } from "next/server";

import { getResourceForecast } from "../../../../lib/resource-intelligence";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceName = searchParams.get("resource");
    const forecast = await getResourceForecast(resourceName ?? "GPU Workstations");

    return NextResponse.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    console.error("Failed to generate resource forecast:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate resource forecast.",
      },
      { status: 500 },
    );
  }
}
